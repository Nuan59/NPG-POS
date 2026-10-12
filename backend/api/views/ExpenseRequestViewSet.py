# ExpenseRequestViewSet.py
# วางไฟล์นี้ใน: backend/api/views/ExpenseRequestViewSet.py
"""
รายการขอจ่ายเงิน (พนักงานขอ → adm อนุมัติเท่านั้น → ลงรายจ่ายเงินสดในหน้า รายรับ-รายจ่าย)

  GET    /expense-requests/                 พนักงานเห็นของตัวเอง, adm เห็นทั้งหมด  ?status=pending&limit=30
  POST   /expense-requests/                 { category, description, amount, receipt_image? }
  GET    /expense-requests/<id>/receipt/    รูปใบเสร็จ { image }
  POST   /expense-requests/<id>/edit/       (เจ้าของขณะรออนุมัติ / adm ได้ทุกสถานะ) { category?, description?, amount?, receipt_image? }
  POST   /expense-requests/<id>/cancel/     (เจ้าของขณะรออนุมัติ / adm) ลบคำขอ
  POST   /expense-requests/<id>/approve/    (adm) { category?, description?, amount? }  → ลงรายจ่ายเงินสดวันนี้
  POST   /expense-requests/<id>/reject/     (adm) { reason }
  POST   /expense-requests/<id>/reopen/     (adm) อนุมัติ/ไม่อนุมัติแล้ว → กลับไปรออนุมัติ (ลบรายจ่ายที่ลงไว้)
  GET    /expense-requests/summary/         { pending } ตัวเลขสำหรับ badge (adm)
"""
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models.Cashflow import CashflowEntry
from api.models.ExpenseRequest import ExpenseRequest

CATEGORIES = [
    'น้ำมัน', 'อะไหล่/สินค้า', 'ค่าแรง', 'ค่าขนส่ง', 'ค่าน้ำ/ไฟ/เน็ต',
    'อุปกรณ์/เครื่องเขียน', 'อาหาร/เครื่องดื่ม', 'เบ็ดเตล็ด', 'อื่นๆ',
]
MAX_IMAGE_CHARS = 3_000_000  # ~2.2MB หลังถอด base64 (หน้าเว็บย่อรูปให้เหลือ ~200KB อยู่แล้ว)


def _is_admin(request):
    return str(getattr(request.user, 'role', '') or '').lower() == 'adm'


def _is_reviewer(request):
    """adm หรือ ผู้ตรวจสอบ (mon) - เห็นคำขอทั้งหมด + อนุมัติ / ไม่อนุมัติ ได้"""
    return str(getattr(request.user, 'role', '') or '').lower() in ('adm', 'mon')


def _display_name(user):
    return (getattr(user, 'name', None) or getattr(user, 'username', '') or '').strip()


def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': msg}, status=code)


def _json(e):
    return {
        'id': e.id,
        'number': f"EX-{e.id:06d}",
        'created_by_username': e.created_by_username,
        'created_by_name': e.created_by_name or e.created_by_username,
        'category': e.category,
        'description': e.description,
        'amount': float(e.amount),
        'has_receipt': bool(e.receipt_image),
        'status': e.status,
        'decided_by': e.decided_by,
        'decided_at': e.decided_at,
        'reject_reason': e.reject_reason,
        'created_at': e.created_at,
    }


def _clean_fields(data, partial):
    """ตรวจ + แปลงค่าจาก request → (dict, None) หรือ (None, Response error)"""
    out = {}
    if 'description' in data or not partial:
        desc = (data.get('description') or '').strip()
        if not desc:
            return None, _err('กรุณากรอกรายการ')
        out['description'] = desc[:255]
    if 'category' in data or not partial:
        cat = (data.get('category') or '').strip()
        if cat and cat not in CATEGORIES:
            return None, _err('หมวดหมู่ไม่ถูกต้อง')
        out['category'] = cat
    if 'amount' in data or not partial:
        try:
            amount = Decimal(str(data.get('amount')))
        except (InvalidOperation, TypeError, ValueError):
            return None, _err('จำนวนเงินไม่ใช่ตัวเลข')
        if amount <= 0:
            return None, _err('จำนวนเงินต้องมากกว่า 0')
        out['amount'] = amount
    if 'receipt_image' in data:
        img = data.get('receipt_image') or None
        if img is not None:
            if not isinstance(img, str) or not img.startswith('data:image/'):
                return None, _err('ไฟล์ใบเสร็จต้องเป็นรูปภาพ')
            if len(img) > MAX_IMAGE_CHARS:
                return None, _err('รูปใบเสร็จใหญ่เกินไป')
        out['receipt_image'] = img
    return out, None


def _cashflow_desc(e):
    cat = f"{e.category}: " if e.category else ''
    return f"จ่าย{cat}{e.description} ({e.created_by_name or e.created_by_username}) EX-{e.id:06d}"[:255]


def _sync_cashflow(e, approver):
    """ให้รายจ่ายเงินสดในหน้า รายรับ-รายจ่าย ตรงกับคำขอ: อนุมัติ = มีรายการ, สถานะอื่น = ไม่มี"""
    entry = CashflowEntry.objects.filter(pk=e.cashflow_entry_id).first() if e.cashflow_entry_id else None
    if e.status != 'approved':
        if entry:
            entry.delete()
        e.cashflow_entry_id = None
        return
    if entry:
        entry.expense = e.amount
        entry.description = _cashflow_desc(e)
        entry.save(update_fields=['expense', 'description'])
        return
    today = timezone.localtime(timezone.now(), ZoneInfo('Asia/Bangkok')).date()
    next_seq = (CashflowEntry.objects.filter(date=today, section='cash').aggregate(m=Max('seq'))['m'] or -1) + 1
    entry = CashflowEntry.objects.create(
        date=today, section='cash', seq=next_seq,
        description=_cashflow_desc(e), expense=e.amount, created_by=approver,
    )
    e.cashflow_entry_id = entry.id


class ExpenseRequestViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def handle_exception(self, exc):
        from rest_framework.exceptions import APIException
        if isinstance(exc, APIException):
            return super().handle_exception(exc)
        import traceback
        traceback.print_exc()
        msg = f"{type(exc).__name__}: {exc}"
        if 'expense_request' in str(exc) and 'does not exist' in str(exc):
            msg = 'ยังไม่ได้สร้างตารางรายการจ่าย กรุณาเปิด /dev/create-expense-request-table/ ก่อน'
        return Response({'error': msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get(self, request, pk, lock=False):
        qs = ExpenseRequest.objects.select_for_update() if lock else ExpenseRequest.objects
        e = qs.filter(pk=pk).first()
        if not e:
            return None, _err('ไม่พบรายการ', status.HTTP_404_NOT_FOUND)
        if not _is_reviewer(request) and e.created_by_username != request.user.username:
            return None, _err('ไม่ใช่รายการของคุณ', status.HTTP_403_FORBIDDEN)
        return e, None

    # ------------------------------------------------ ทุกคน

    def list(self, request):
        qs = ExpenseRequest.objects.defer('receipt_image').all()
        if not _is_reviewer(request):
            qs = qs.filter(created_by_username=request.user.username)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        try:
            limit = min(int(request.query_params.get('limit', 30)), 200)
        except ValueError:
            limit = 30
        # has_receipt ต้องรู้ว่ามีรูปไหม โดยไม่โหลดรูปทั้งก้อน
        ids_with_receipt = set(
            ExpenseRequest.objects.filter(pk__in=[e.pk for e in qs[:limit]], receipt_image__isnull=False)
            .exclude(receipt_image='').values_list('id', flat=True)
        )
        out = []
        for e in qs[:limit]:
            row = _json_light(e)
            row['has_receipt'] = e.id in ids_with_receipt
            out.append(row)
        return Response(out)

    def create(self, request):
        fields, err = _clean_fields(request.data, partial=False)
        if err:
            return err
        e = ExpenseRequest.objects.create(
            created_by_username=request.user.username,
            created_by_name=_display_name(request.user),
            **fields,
        )
        return Response(_json(e), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        e, err = self._get(request, pk)
        if err:
            return err
        return Response({'image': e.receipt_image})

    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        with transaction.atomic():
            e, err = self._get(request, pk, lock=True)
            if err:
                return err
            if not _is_admin(request) and e.status != 'pending':
                return _err('รายการนี้ adm ตัดสินแล้ว แก้ไขไม่ได้')
            fields, err = _clean_fields(request.data, partial=True)
            if err:
                return err
            for k, v in fields.items():
                setattr(e, k, v)
            _sync_cashflow(e, _display_name(request.user))  # อนุมัติแล้ว → แก้รายจ่ายตาม
            e.save()
        return Response(_json(e))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            e, err = self._get(request, pk, lock=True)
            if err:
                return err
            if e.status != 'pending':
                return _err('ยกเลิกได้เฉพาะรายการที่รออนุมัติ (adm กด "ย้อนกลับ" ก่อน)')
            e.delete()
        return Response({'message': 'ยกเลิกคำขอแล้ว'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        pending = ExpenseRequest.objects.filter(status='pending')
        if not _is_reviewer(request):
            pending = pending.filter(created_by_username=request.user.username)
        return Response({'pending': pending.count(), 'categories': CATEGORIES})

    # ------------------------------------------------ adm เท่านั้น

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not _is_reviewer(request):
            return _err('เฉพาะ adm / ผู้ตรวจสอบ เท่านั้นที่อนุมัติได้', status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            e, err = self._get(request, pk, lock=True)
            if err:
                return err
            if e.status != 'pending':
                return _err('รายการนี้ตัดสินไปแล้ว')
            fields, err = _clean_fields(request.data, partial=True)
            if err:
                return err
            fields.pop('receipt_image', None)
            for k, v in fields.items():
                setattr(e, k, v)
            approver = _display_name(request.user)
            e.status = 'approved'
            e.decided_by = approver
            e.decided_at = timezone.now()
            e.reject_reason = ''
            _sync_cashflow(e, approver)
            e.save()
        return Response(_json(e))

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not _is_reviewer(request):
            return _err('เฉพาะ adm เท่านั้น', status.HTTP_403_FORBIDDEN)
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return _err('กรุณาระบุเหตุผลที่ไม่อนุมัติ')
        with transaction.atomic():
            e, err = self._get(request, pk, lock=True)
            if err:
                return err
            if e.status != 'pending':
                return _err('รายการนี้ตัดสินไปแล้ว')
            e.status = 'rejected'
            e.decided_by = _display_name(request.user)
            e.decided_at = timezone.now()
            e.reject_reason = reason
            _sync_cashflow(e, '')
            e.save()
        return Response(_json(e))

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        if not _is_admin(request):
            return _err('เฉพาะ adm เท่านั้น', status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            e, err = self._get(request, pk, lock=True)
            if err:
                return err
            if e.status == 'pending':
                return _err('รายการนี้ยังรออนุมัติอยู่')
            e.status = 'pending'
            e.decided_by = ''
            e.decided_at = None
            e.reject_reason = ''
            _sync_cashflow(e, '')  # ลบรายจ่ายที่ลงไว้
            e.save()
        return Response(_json(e))


def _json_light(e):
    """เหมือน _json แต่ไม่แตะ receipt_image (list ใช้ defer ไว้ ไม่ให้โหลดรูปทุกแถว)"""
    return {
        'id': e.id,
        'number': f"EX-{e.id:06d}",
        'created_by_username': e.created_by_username,
        'created_by_name': e.created_by_name or e.created_by_username,
        'category': e.category,
        'description': e.description,
        'amount': float(e.amount),
        'has_receipt': False,
        'status': e.status,
        'decided_by': e.decided_by,
        'decided_at': e.decided_at,
        'reject_reason': e.reject_reason,
        'created_at': e.created_at,
    }