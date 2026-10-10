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
  POST   /cash-handover/<id>/cancel/       (เจ้าของใบ / adm ขณะยัง pending) ยกเลิกใบ รายการกลับไปค้างส่ง
  GET    /cash-handover/summary/           ตัวเลขสำหรับ badge

  ✅ adm แก้ได้ทุกอย่าง
  POST   /cash-handover/receive-direct/       { username, items, received_amount?, note? }  รับเงินแทน (พนักงานยังไม่ได้กดส่ง)
  POST   /cash-handover/exclude/              { username, items, note }  ตัดรายการออก ไม่ต้องส่ง (status=excluded)
  POST   /cash-handover/<id>/restore/         คืนรายการที่ตัดออก → กลับไปค้างส่ง
  POST   /cash-handover/<id>/remove-item/     { source, source_id }      เอารายการออกจากใบที่รอรับ → กลับไปค้างส่ง
  POST   /cash-handover/<id>/edit-item/       { source, source_id, amount }  แก้ยอดรายการในใบที่รอรับ
  POST   /cash-handover/<id>/edit-received/   { received_amount, note? }  แก้ยอดที่รับแล้ว → แก้รายรับให้ตาม
  POST   /cash-handover/<id>/unreceive/       ยกเลิกการรับ → ใบกลับไปรอรับ + ลบรายรับที่ลงไว้
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

from api.models import Order, User, NPGPayment, NPGAccount
from api.models.ServiceRecord import ServiceRecord
from api.models.CashHandover import CashHandover, CashHandoverItem, CashHandoverConfig
from api.models.Cashflow import CashflowEntry

try:
    from api.models.NPGPayment import NPGFee
except ImportError:  # ยังไม่ได้ deploy ระบบค่าธรรมเนียม NPG
    NPGFee = None

CASH = 'เงินสด'
SPLIT = 'แบ่งจ่าย'
CASH_TYPES = (CASH, SPLIT)


def _cash_part(full, cash_amount):
    """ยอดเงินสดของรายการ: ระบุยอดเงินสดไว้ (แบ่งจ่าย / adm แก้ย้อนหลัง) ใช้ยอดนั้น ไม่เกินยอดเต็ม, ไม่ระบุ = ยอดเต็ม"""
    if cash_amount is None:
        return full
    return min(Decimal(str(cash_amount)), full)


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
        transaction_type='ขาย', payment_type__in=CASH_TYPES, created_at__gte=start,
    ).select_related('customer', 'seller').prefetch_related('bikes', 'additional_fees')
    if username:
        qs = qs.filter(seller__username=username)
    for o in qs:
        bike = o.bikes.first()
        desc = f"ขาย O-{o.id:08d} · {o.customer.name if o.customer else '-'}"
        if bike:
            desc += f" · {bike.model_name}"
        # ✅ เฉพาะเงินที่ต้องจ่ายในวันทำรายการ (หักส่วนผ่อนดาวน์ / มัดจำออกแล้ว)
        add('sale', o.id, _cash_part(_sale_due_today(o), o.cash_amount), desc, o.created_at, o.seller.username if o.seller else '')

    # 2) งานบริการ (ซ่อม / ต่อภาษี+พรบ / อื่นๆ)
    qs = ServiceRecord.objects.filter(payment_type__in=CASH_TYPES, created_at__gte=start).select_related('customer')
    if username:
        qs = qs.filter(created_by=username)
    for r in qs:
        label = r.transaction_type_detail if r.transaction_type == 'อื่นๆ' and r.transaction_type_detail else r.transaction_type
        desc = f"{label} S-{r.id:08d} · {r.customer.name if r.customer else '-'}"
        add('service', r.id, _cash_part(Decimal(str(r.total or 0)), r.cash_amount), desc, r.created_at, r.created_by)

    # 3) ค่างวด NPG (รวมค่าปรับที่เก็บพร้อมงวด)
    qs = NPGPayment.objects.filter(payment_method__in=CASH_TYPES, created_at__gte=start).select_related(
        'account__order__customer', 'created_by'
    )
    if username:
        qs = qs.filter(created_by__username=username)
    for p in qs:
        customer = p.account.order.customer.name if p.account and p.account.order and p.account.order.customer else '-'
        amount = _cash_part(Decimal(str(p.amount_paid or 0)) + Decimal(str(p.late_fee or 0)), p.cash_amount)
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


def _sale_due_today(o):
    """
    ยอดที่ลูกค้าต้องจ่าย "ในวันที่ทำรายการ" ของงานขาย (ไม่ใช้ Order.total ตรงๆ)
    - ไฟแนนซ์:  เงินดาวน์ที่จ่ายวันนี้ + ค่าใช้จ่ายเพิ่มเติม - มัดจำ   (= "ยอดชำระรวม" ตอนกดสั่งซื้อ)
                 เงินดาวน์ที่จ่ายวันนี้ = เงินดาวน์ทั้งหมด (down_payment)
                   - ถ้าเปิดผ่อนดาวน์: หักยอดที่ยกไปผ่อน (finance_amount ของบัญชี NPG ประเภท down_payment)
                     เหลือแค่ "งวดแรก (ชำระวันนี้)" - งวดถัดไปจะขึ้นค้างส่งตอนบันทึกรับค่างวดใน NPG
    - เงินสด:   ราคาสินค้า + ค่าใช้จ่ายเพิ่มเติม - มัดจำ - ส่วนลด
    มัดจำไม่นับ เพราะรับไปแล้วตั้งแต่วันวางมัดจำ
    """
    fees = sum(Decimal(str(f.amount or 0)) for f in o.additional_fees.all())
    deposit = Decimal(str(o.deposit or 0))
    # ✅ นับเป็นไฟแนนซ์ถ้ามียอดจัด / จำนวนงวด / เงินดาวน์ อย่างใดอย่างหนึ่ง
    # (บางออเดอร์ไม่ได้เก็บ finance_provider ไว้ เช่น เงินติดล้อ เลยเช็คจากตัวเลขแทน)
    is_finance = (
        Decimal(str(o.finance_amount or 0)) > 0
        or (o.installment_count or 0) > 0
        or Decimal(str(o.down_payment or 0)) > 0
    )

    if is_finance:
        due = Decimal(str(o.down_payment or 0)) + fees - deposit
        dp_account = NPGAccount.objects.filter(order=o, account_type='down_payment').first()
        if dp_account:
            due -= Decimal(str(dp_account.finance_amount or 0))
    else:
        due = Decimal(str(o.sale_price or 0)) + fees - deposit - Decimal(str(o.discount or 0))

    return max(due, Decimal('0'))


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


def _forbidden():
    return Response({'error': 'เฉพาะ adm เท่านั้น'}, status=status.HTTP_403_FORBIDDEN)


def _parse_amount(raw, label='ยอดเงิน'):
    """คืน (Decimal, None) หรือ (None, Response error)"""
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None, Response({'error': f'{label}ไม่ใช่ตัวเลข'}, status=status.HTTP_400_BAD_REQUEST)
    if value < 0:
        return None, Response({'error': f'{label}ต้องไม่ติดลบ'}, status=status.HTTP_400_BAD_REQUEST)
    return value, None


def _parse_keys(items):
    keys = []
    for it in items or []:
        try:
            k = (str(it.get('source')), int(it.get('source_id')))
        except (TypeError, ValueError, AttributeError):
            continue
        if k not in keys:
            keys.append(k)
    return keys


def _today_bkk():
    return timezone.localtime(timezone.now(), ZoneInfo('Asia/Bangkok')).date()


def _sync_cashflow(h, amount, receiver):
    """
    ทำให้รายรับในหน้า รายรับ-รายจ่าย (ส่วนเงินสด) ตรงกับยอดที่รับของใบนี้
    - amount > 0: มีรายการเดิม → แก้ยอด (คงวันที่เดิม) / ไม่มี (หรือถูกลบไปแล้ว) → สร้างใหม่วันนี้
    - amount = 0 / None: ลบรายการเดิม
    """
    entry = CashflowEntry.objects.filter(pk=h.cashflow_entry_id).first() if h.cashflow_entry_id else None
    if not amount or amount <= 0:
        if entry:
            entry.delete()
        h.cashflow_entry_id = None
        return
    desc = f"รับเงินส่ง HO-{h.id:06d} จาก {h.created_by_name or h.created_by_username}"[:255]
    if entry:
        entry.income = amount
        entry.description = desc
        entry.save(update_fields=['income', 'description'])
        return
    today = _today_bkk()
    next_seq = (CashflowEntry.objects.filter(date=today, section='cash').aggregate(m=Max('seq'))['m'] or -1) + 1
    entry = CashflowEntry.objects.create(
        date=today, section='cash', seq=next_seq, description=desc, income=amount, created_by=receiver,
    )
    h.cashflow_entry_id = entry.id


def _recalc_total(h):
    h.total = sum((i.amount for i in h.items.all()), Decimal('0'))


SOURCE_MODEL = {'sale': Order, 'service': ServiceRecord, 'npg_payment': NPGPayment}


# ---------------------------------------------------------------- viewset

class CashHandoverViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def handle_exception(self, exc):
        # ✅ error ที่ไม่ใช่ของ DRF (เช่น ตารางยังไม่ได้สร้าง) ให้ส่งข้อความจริงกลับไป แทนหน้า 500 เปล่าๆ
        from rest_framework.exceptions import APIException
        if isinstance(exc, APIException):
            return super().handle_exception(exc)
        import traceback
        traceback.print_exc()
        msg = f"{type(exc).__name__}: {exc}"
        if 'cash_handover' in str(exc) and 'does not exist' in str(exc):
            msg = 'ยังไม่ได้สร้างตารางระบบส่งเงิน กรุณาเปิด /dev/create-cash-handover-tables/ ก่อน'
        return Response({'error': msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request):
        qs = CashHandover.objects.prefetch_related('items').all()
        if not _is_admin(request):
            qs = qs.filter(created_by_username=request.user.username)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        else:
            qs = qs.exclude(status='excluded')  # รายการที่ adm ตัดออก ไม่ใช่ใบส่งเงินจริง
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

    @action(detail=False, methods=['post'], url_path='set-cash-amount')
    def set_cash_amount(self, request):
        """
        (adm) แก้ยอดเงินสดของรายการที่ยังไม่ได้ส่ง - ใช้กับรายการเก่าที่ลูกค้าแบ่งจ่ายเงินสด/โอน
        body: { source: sale|service|npg_payment, source_id, cash_amount }   cash_amount = null → กลับไปใช้ยอดเต็ม
        """
        if not _is_admin(request):
            return Response({'error': 'เฉพาะ adm เท่านั้น'}, status=status.HTTP_403_FORBIDDEN)

        source = request.data.get('source')
        model = {'sale': Order, 'service': ServiceRecord, 'npg_payment': NPGPayment}.get(source)
        if model is None:
            return Response({'error': 'แก้ยอดเงินสดได้เฉพาะ ขาย / งานบริการ / ค่างวด NPG'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            source_id = int(request.data.get('source_id'))
        except (TypeError, ValueError):
            return Response({'error': 'source_id ไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        if CashHandoverItem.objects.filter(source=source, source_id=source_id).exists():
            return Response({'error': 'รายการนี้ส่งเงินไปแล้ว แก้ยอดไม่ได้'}, status=status.HTTP_400_BAD_REQUEST)

        obj = model.objects.filter(pk=source_id).first()
        if not obj:
            return Response({'error': 'ไม่พบรายการ'}, status=status.HTTP_404_NOT_FOUND)

        raw = request.data.get('cash_amount')
        if raw in (None, ''):
            obj.cash_amount = None
        else:
            try:
                value = Decimal(str(raw))
            except InvalidOperation:
                return Response({'error': 'ยอดเงินสดไม่ใช่ตัวเลข'}, status=status.HTTP_400_BAD_REQUEST)
            if value < 0:
                return Response({'error': 'ยอดเงินสดต้องไม่ติดลบ'}, status=status.HTTP_400_BAD_REQUEST)
            obj.cash_amount = value
        obj.save(update_fields=['cash_amount'])
        return Response({'message': 'แก้ยอดเงินสดแล้ว', 'cash_amount': float(obj.cash_amount) if obj.cash_amount is not None else None})

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

            self._mark_received(h, received, request)

        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h))

    def _mark_received(self, h, received, request):
        """ตั้งใบเป็นรับแล้ว + ลงรายรับเงินสดตามยอดที่รับจริง (เรียกภายใน transaction)"""
        receiver = _display_name(request.user)
        h.cashflow_entry_id = None
        _sync_cashflow(h, received, receiver)
        h.received_amount = received
        h.received_by = receiver
        h.received_at = timezone.now()
        h.received_note = (request.data.get('note') or '').strip()
        h.status = 'received' if received == h.total else 'mismatch'
        h.save()

    # ------------------------------------------------ adm: รายการที่ยังไม่ได้ส่ง

    def _pick_unsent(self, request):
        """รายการค้างส่งของพนักงาน username ที่เลือกมา → (username, rows, None) หรือ (.., .., Response error)"""
        username = (request.data.get('username') or '').strip()
        keys = _parse_keys(request.data.get('items'))
        if not keys:
            return username, [], Response({'error': 'กรุณาเลือกรายการอย่างน้อย 1 รายการ'}, status=status.HTTP_400_BAD_REQUEST)
        pool = {(r['source'], r['source_id']): r for r in _collect_unsent(username or None)}
        rows = [pool[k] for k in keys if k in pool]
        if len(rows) != len(keys):
            return username, [], Response(
                {'error': 'บางรายการถูกส่ง/รับไปแล้ว กรุณารีเฟรชแล้วลองใหม่'}, status=status.HTTP_409_CONFLICT,
            )
        return username, rows, None

    def _create_handover(self, username, rows, note, status_value='pending'):
        name = User.objects.filter(username=username).values_list('name', flat=True).first() if username else ''
        h = CashHandover.objects.create(
            created_by_username=username,
            created_by_name=name or username,
            total=sum((r['amount'] for r in rows), Decimal('0')),
            note=note,
            status=status_value,
        )
        CashHandoverItem.objects.bulk_create([
            CashHandoverItem(
                handover=h, source=r['source'], source_id=r['source_id'],
                amount=r['amount'], description=r['description'][:500], record_date=r['record_date'],
            )
            for r in rows
        ])
        return h

    @action(detail=False, methods=['post'], url_path='receive-direct')
    def receive_direct(self, request):
        """(adm) รับเงินแทน - พนักงานยังไม่ได้กดส่ง ให้ adm รับเลย (สร้างใบให้ + รับ + ลงรายรับ)"""
        if not _is_admin(request):
            return _forbidden()
        username, rows, err = self._pick_unsent(request)
        if err:
            return err
        raw = request.data.get('received_amount')
        received = None
        if raw not in (None, ''):
            received, err = _parse_amount(raw, 'ยอดที่รับ')
            if err:
                return err
        try:
            with transaction.atomic():
                h = self._create_handover(username, rows, 'adm รับเงินแทน')
                h = CashHandover.objects.select_for_update().get(pk=h.pk)
                self._mark_received(h, h.total if received is None else received, request)
        except IntegrityError:
            return Response({'error': 'มีรายการถูกส่งซ้ำ กรุณารีเฟรชแล้วลองใหม่'}, status=status.HTTP_409_CONFLICT)
        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def exclude(self, request):
        """(adm) ตัดรายการออก - ไม่ใช่เงินสดจริง / ไม่ต้องส่ง (ไม่ลงรายรับ) คืนได้ภายหลังด้วย restore"""
        if not _is_admin(request):
            return _forbidden()
        username, rows, err = self._pick_unsent(request)
        if err:
            return err
        try:
            with transaction.atomic():
                h = self._create_handover(username, rows, '', status_value='excluded')
                h.received_by = _display_name(request.user)
                h.received_at = timezone.now()
                h.received_note = (request.data.get('note') or '').strip()
                h.save()
        except IntegrityError:
            return Response({'error': 'มีรายการถูกส่งไปแล้ว กรุณารีเฟรชแล้วลองใหม่'}, status=status.HTTP_409_CONFLICT)
        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """(adm) คืนรายการที่ตัดออก → กลับไปค้างส่ง"""
        if not _is_admin(request):
            return _forbidden()
        h = CashHandover.objects.filter(pk=pk, status='excluded').first()
        if not h:
            return Response({'error': 'ไม่พบรายการที่ตัดออก'}, status=status.HTTP_404_NOT_FOUND)
        h.delete()
        return Response({'message': 'คืนรายการแล้ว กลับไปค้างส่ง'})

    # ------------------------------------------------ adm: ใบที่รอรับ

    def _pending_item(self, request, pk):
        """(h, item, None) ของใบที่รอรับ หรือ (None, None, Response error) - ต้องเรียกใน transaction"""
        h = CashHandover.objects.select_for_update().filter(pk=pk).first()
        if not h:
            return None, None, Response({'error': 'ไม่พบใบส่งเงิน'}, status=status.HTTP_404_NOT_FOUND)
        if h.status != 'pending':
            return None, None, Response({'error': 'ใบนี้รับไปแล้ว กด "ยกเลิกการรับ" ก่อนถึงจะแก้รายการได้'}, status=status.HTTP_400_BAD_REQUEST)
        keys = _parse_keys([request.data])
        item = h.items.filter(source=keys[0][0], source_id=keys[0][1]).first() if keys else None
        if not item:
            return None, None, Response({'error': 'ไม่พบรายการในใบนี้'}, status=status.HTTP_404_NOT_FOUND)
        return h, item, None

    @action(detail=True, methods=['post'], url_path='remove-item')
    def remove_item(self, request, pk=None):
        """(adm) เอารายการออกจากใบที่รอรับ → รายการกลับไปค้างส่ง (ถ้าใบไม่เหลือรายการ ลบใบทิ้ง)"""
        if not _is_admin(request):
            return _forbidden()
        with transaction.atomic():
            h, item, err = self._pending_item(request, pk)
            if err:
                return err
            item.delete()
            if not h.items.exists():
                h.delete()
                return Response({'message': 'ใบไม่เหลือรายการ ยกเลิกใบให้แล้ว', 'deleted': True})
            _recalc_total(h)
            h.save(update_fields=['total'])
        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h))

    @action(detail=True, methods=['post'], url_path='edit-item')
    def edit_item(self, request, pk=None):
        """(adm) แก้ยอดเงินสดของรายการในใบที่รอรับ (บันทึกยอดเงินสดที่รายการต้นทางด้วย ถ้ารองรับ)"""
        if not _is_admin(request):
            return _forbidden()
        amount, err = _parse_amount(request.data.get('amount'), 'ยอดเงินสด')
        if err:
            return err
        with transaction.atomic():
            h, item, err = self._pending_item(request, pk)
            if err:
                return err
            item.amount = amount
            item.save(update_fields=['amount'])
            model = SOURCE_MODEL.get(item.source)
            if model is not None:
                model.objects.filter(pk=item.source_id).update(cash_amount=amount)
            _recalc_total(h)
            h.save(update_fields=['total'])
        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h))

    # ------------------------------------------------ adm: ใบที่รับแล้ว

    @action(detail=True, methods=['post'], url_path='edit-received')
    def edit_received(self, request, pk=None):
        """(adm) แก้ยอดที่รับแล้ว → รายรับในหน้า รายรับ-รายจ่าย แก้ตาม"""
        if not _is_admin(request):
            return _forbidden()
        received, err = _parse_amount(request.data.get('received_amount'), 'ยอดที่รับ')
        if err:
            return err
        with transaction.atomic():
            h = CashHandover.objects.select_for_update().filter(pk=pk).first()
            if not h:
                return Response({'error': 'ไม่พบใบส่งเงิน'}, status=status.HTTP_404_NOT_FOUND)
            if h.status not in ('received', 'mismatch'):
                return Response({'error': 'ใบนี้ยังไม่ได้รับเงิน'}, status=status.HTTP_400_BAD_REQUEST)
            _sync_cashflow(h, received, _display_name(request.user))
            h.received_amount = received
            if 'note' in request.data:
                h.received_note = (request.data.get('note') or '').strip()
            h.status = 'received' if received == h.total else 'mismatch'
            h.save()
        h = CashHandover.objects.prefetch_related('items').get(pk=h.pk)
        return Response(_handover_json(h))

    @action(detail=True, methods=['post'])
    def unreceive(self, request, pk=None):
        """(adm) ยกเลิกการรับ → ใบกลับไปรอรับ + ลบรายรับที่ลงไว้"""
        if not _is_admin(request):
            return _forbidden()
        with transaction.atomic():
            h = CashHandover.objects.select_for_update().filter(pk=pk).first()
            if not h:
                return Response({'error': 'ไม่พบใบส่งเงิน'}, status=status.HTTP_404_NOT_FOUND)
            if h.status not in ('received', 'mismatch'):
                return Response({'error': 'ใบนี้ยังไม่ได้รับเงิน'}, status=status.HTTP_400_BAD_REQUEST)
            _sync_cashflow(h, None, '')
            h.received_amount = None
            h.received_by = ''
            h.received_at = None
            h.received_note = ''
            h.status = 'pending'
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