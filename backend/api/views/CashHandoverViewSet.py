# CashHandoverViewSet.py
# วางไฟล์นี้ใน: backend/api/views/CashHandoverViewSet.py
"""
ระบบส่งเงินสดให้ adm
- เงินสดทุกรายการ (ขาย / งานบริการ / ค่างวด NPG / ค่าธรรมเนียม NPG) ที่บันทึกหลังวันเริ่มใช้ระบบ
  จะขึ้นเป็น "ค้างส่ง" ของพนักงานที่บันทึกอัตโนมัติ (ดึงสดจากตารางต้นทาง ไม่แตะตารางเดิม)
- พนักงานเลือกรายการแล้วกดส่ง = ใบส่งเงิน 1 ใบ (สถานะ pending)
- adm กดรับเงิน → received / mismatch + ลงรายรับในหน้า รายรับ-รายจ่าย (ส่วนเงินสด) ให้อัตโนมัติ

  GET    /cash-handover/unsent/            เงินสดค้างส่งของฉัน  (adm: ?all=1 = ของพนักงานทุกคน)
  GET    /cash-handover/                   ใบส่งเงิน (พนักงานเห็นของตัวเอง, adm เห็นทั้งหมด) ?status=pending
  POST   /cash-handover/submit/            { items: [{source, source_id}], note }
  POST   /cash-handover/<id>/receive/      (adm) { received_amount?, note? }
  POST   /cash-handover/<id>/cancel/       (เจ้าของใบ ขณะยัง pending) ยกเลิกใบ รายการกลับไปค้างส่ง
  GET    /cash-handover/summary/           ตัวเลขสำหรับ badge
"""
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from django.db import transaction, IntegrityError
from django.db.models import Max
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Order, User, NPGPayment
from api.models.ServiceRecord import ServiceRecord
from api.models.CashHandover import CashHandover, CashHandoverItem, CashHandoverConfig
from api.models.Cashflow import CashflowEntry

try:
    from api.models.NPGPayment import NPGFee
except ImportError:  # ยังไม่ได้ deploy ระบบค่าธรรมเนียม NPG
    NPGFee = None

CASH = 'เงินสด'


# ---------------------------------------------------------------- helpers

def _is_admin(request):
    return str(getattr(request.user, 'role', '') or '').lower() == 'adm'


def _display_name(user):
    return (getattr(user, 'name', None) or getattr(user, 'username', '') or '').strip()


def _start_at():
    cfg = CashHandoverConfig.objects.order_by('id').first()
    return cfg.start_at if cfg else timezone.now()


def _admin_usernames():
    try:
        return set(User.objects.filter(role__iexact='adm').values_list('username', flat=True))
    except Exception:
        return set()


def _sent_keys():
    return set(CashHandoverItem.objects.values_list('source', 'source_id'))


def _collect_unsent(username=None):
    """
    เงินสดที่ยังไม่ได้ส่ง - username=None คือทุกคน (ยกเว้น adm เอง เพราะ adm ไม่ต้องส่งให้ตัวเอง)
    คืนค่าเป็น list ของ dict: source, source_id, amount, description, record_date, username
    """
    start = _start_at()
    sent = _sent_keys()
    rows = []

    def add(source, source_id, amount, description, record_date, user):
        if (source, source_id) in sent:
            return
        amount = Decimal(str(amount or 0))
        if amount <= 0:
            return
        rows.append({
            'source': source,
            'source_id': source_id,
            'amount': amount,
            'description': description,
            'record_date': record_date,
            'username': user or '',
        })

    # 1) ขาย
    qs = Order.objects.filter(
        transaction_type='ขาย', payment_type=CASH, created_at__gte=start
    ).select_related('customer', 'seller').prefetch_related('bikes')
    if username:
        qs = qs.filter(seller__username=username)
    for o in qs:
        bike = o.bikes.first()
        desc = f"ขาย O-{o.id:08d} · {o.customer.name if o.customer else '-'}"
        if bike:
            desc += f" · {bike.model_name}"
        add('sale', o.id, o.total, desc, o.created_at, o.seller.username if o.seller else '')

    # 2) งานบริการ (ซ่อม / ต่อภาษี+พรบ / อื่นๆ)
    qs = ServiceRecord.objects.filter(payment_type=CASH, created_at__gte=start).select_related('customer')
    if username:
        qs = qs.filter(created_by=username)
    for r in qs:
        label = r.transaction_type_detail if r.transaction_type == 'อื่นๆ' and r.transaction_type_detail else r.transaction_type
        desc = f"{label} S-{r.id:08d} · {r.customer.name if r.customer else '-'}"
        add('service', r.id, r.total, desc, r.created_at, r.created_by)

    # 3) ค่างวด NPG (รวมค่าปรับที่เก็บพร้อมงวด)
    qs = NPGPayment.objects.filter(payment_method=CASH, created_at__gte=start).select_related(
        'account__order__customer', 'created_by'
    )
    if username:
        qs = qs.filter(created_by__username=username)
    for p in qs:
        customer = p.account.order.customer.name if p.account and p.account.order and p.account.order.customer else '-'
        amount = Decimal(str(p.amount_paid or 0)) + Decimal(str(p.late_fee or 0))
        desc = f"ค่างวด NPG #{p.account_id} งวดที่ {p.installment_number} · {customer}"
        if p.late_fee:
            desc += f" (รวมค่าปรับ {p.late_fee:,.0f})"
        add('npg_payment', p.id, amount, desc, p.created_at, p.created_by.username if p.created_by else '')

    # 4) ค่าธรรมเนียม NPG
    if NPGFee is not None:
        try:
            qs = NPGFee.objects.filter(payment_method=CASH, created_at__gte=start).select_related('account__order__customer')
            if username:
                qs = qs.filter(created_by=username)
            for f in qs:
                customer = f.account.order.customer.name if f.account and f.account.order and f.account.order.customer else '-'
                add('npg_fee', f.id, f.amount, f"ค่าธรรมเนียม NPG: {f.description} · {customer}", f.created_at, f.created_by)
        except Exception:
            pass  # ตาราง npg_fees ยังไม่ได้สร้าง

    if not username:
        admins = _admin_usernames()
        rows = [r for r in rows if r['username'] not in admins]

    rows.sort(key=lambda r: r['record_date'] or timezone.now(), reverse=True)
    return rows


def _row_json(r):
    return {
        'source': r['source'],
        'source_id': r['source_id'],
        'amount': float(r['amount']),
        'description': r['description'],
        'record_date': r['record_date'],
        'username': r['username'],
    }


def _handover_json(h):
    return {
        'id': h.id,
        'number': f"HO-{h.id:06d}",
        'created_by_username': h.created_by_username,
        'created_by_name': h.created_by_name or h.created_by_username,
        'total': float(h.total),
        'note': h.note,
        'status': h.status,
        'received_amount': float(h.received_amount) if h.received_amount is not None else None,
        'received_by': h.received_by,
        'received_at': h.received_at,
        'received_note': h.received_note,
        'created_at': h.created_at,
        'items': [
            {
                'source': i.source,
                'source_id': i.source_id,
                'amount': float(i.amount),
                'description': i.description,
                'record_date': i.record_date,
            }
            for i in h.items.all()
        ],
    }


# ---------------------------------------------------------------- viewset

class CashHandoverViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = CashHandover.objects.prefetch_related('items').all()
        if not _is_admin(request):
            qs = qs.filter(created_by_username=request.user.username)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        limit = int(request.query_params.get('limit', 50))
        return Response([_handover_json(h) for h in qs[:limit]])

    @action(detail=False, methods=['get'])
    def unsent(self, request):
        if _is_admin(request) and request.query_params.get('all'):
            rows = _collect_unsent(None)
            names = dict(User.objects.values_list('username', 'name')) if rows else {}
            groups = {}
            for r in rows:
                g = groups.setdefault(r['username'], {
                    'username': r['username'],
                    'name': names.get(r['username']) or r['username'] or 'ไม่ระบุผู้บันทึก',
                    'count': 0, 'total': 0.0, 'items': [],
                })
                g['count'] += 1
                g['total'] += float(r['amount'])
                g['items'].append(_row_json(r))
            return Response(sorted(groups.values(), key=lambda g: -g['total']))

        rows = _collect_unsent(request.user.username)
        return Response([_row_json(r) for r in rows])

    @action(detail=False, methods=['get'])
    def summary(self, request):
        data = {'unsent_count': 0, 'unsent_total': 0.0, 'pending_to_receive': 0}
        if _is_admin(request):
            data['pending_to_receive'] = CashHandover.objects.filter(status='pending').count()
        else:
            rows = _collect_unsent(request.user.username)
            data['unsent_count'] = len(rows)
            data['unsent_total'] = float(sum(r['amount'] for r in rows))
        return Response(data)

    @action(detail=False, methods=['post'])
    def submit(self, request):
        wanted = request.data.get('items') or []
        keys = set()
        for it in wanted:
            try:
                keys.add((str(it.get('source')), int(it.get('source_id'))))
            except (TypeError, ValueError):
                continue
        if not keys:
            return Response({'error': 'กรุณาเลือกรายการที่จะส่งอย่างน้อย 1 รายการ'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ ยอดเงินคำนวณจากรายการต้นทางจริงฝั่ง backend เสมอ และส่งได้เฉพาะรายการของตัวเองที่ยังไม่เคยส่ง
        mine = {(r['source'], r['source_id']): r for r in _collect_unsent(request.user.username)}
        chosen = [mine[k] for k in keys if k in mine]
        if len(chosen) != len(keys):
            return Response(
                {'error': 'บางรายการถูกส่งไปแล้ว หรือไม่ใช่รายการของคุณ กรุณารีเฟรชแล้วลองใหม่'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                h = CashHandover.objects.create(
                    created_by_username=request.user.username,
                    created_by_name=_display_name(request.user),
                    total=sum(r['amount'] for r in chosen),
                    note=(request.data.get('note') or '').strip(),
                )
                CashHandoverItem.objects.bulk_create([
                    CashHandoverItem(
                        handover=h, source=r['source'], source_id=r['source_id'],
                        amount=r['amount'], description=r['description'][:500], record_date=r['record_date'],
                    )
                    for r in chosen
                ])
        except IntegrityError:
            return Response({'error': 'มีรายการถูกส่งซ้ำ กรุณารีเฟรชแล้วลองใหม่'}, status=status.HTTP_409_CONFLICT)

        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        if not _is_admin(request):
            return Response({'error': 'เฉพาะ adm เท่านั้นที่กดรับเงินได้'}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            h = CashHandover.objects.select_for_update().filter(pk=pk).first()
            if not h:
                return Response({'error': 'ไม่พบใบส่งเงิน'}, status=status.HTTP_404_NOT_FOUND)
            if h.status != 'pending':
                return Response({'error': 'ใบส่งเงินนี้รับไปแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

            raw = request.data.get('received_amount')
            if raw in (None, ''):
                received = h.total
            else:
                try:
                    received = Decimal(str(raw))
                except InvalidOperation:
                    return Response({'error': 'ยอดที่รับไม่ใช่ตัวเลข'}, status=status.HTTP_400_BAD_REQUEST)
                if received < 0:
                    return Response({'error': 'ยอดที่รับต้องไม่ติดลบ'}, status=status.HTTP_400_BAD_REQUEST)

            receiver = _display_name(request.user)
            now = timezone.now()
            today = timezone.localtime(now, ZoneInfo('Asia/Bangkok')).date()

            # ✅ ลงรายรับในหน้า รายรับ-รายจ่าย (ส่วนเงินสด) ตามยอดที่รับจริง
            entry_id = None
            if received > 0:
                next_seq = (CashflowEntry.objects.filter(date=today, section='cash').aggregate(m=Max('seq'))['m'] or -1) + 1
                desc = f"รับเงินส่ง HO-{h.id:06d} จาก {h.created_by_name or h.created_by_username}"
                entry = CashflowEntry.objects.create(
                    date=today, section='cash', seq=next_seq,
                    description=desc[:255], income=received, created_by=receiver,
                )
                entry_id = entry.id

            h.received_amount = received
            h.received_by = receiver
            h.received_at = now
            h.received_note = (request.data.get('note') or '').strip()
            h.status = 'received' if received == h.total else 'mismatch'
            h.cashflow_entry_id = entry_id
            h.save()

        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        h = CashHandover.objects.filter(pk=pk).first()
        if not h:
            return Response({'error': 'ไม่พบใบส่งเงิน'}, status=status.HTTP_404_NOT_FOUND)
        if h.created_by_username != request.user.username and not _is_admin(request):
            return Response({'error': 'ยกเลิกได้เฉพาะใบส่งเงินของตัวเอง'}, status=status.HTTP_403_FORBIDDEN)
        if h.status != 'pending':
            return Response({'error': 'adm รับเงินแล้ว ยกเลิกไม่ได้'}, status=status.HTTP_400_BAD_REQUEST)
        h.delete()  # รายการในใบถูกลบตาม → กลับไปเป็นค้างส่ง
        return Response({'message': 'ยกเลิกใบส่งเงินแล้ว'})