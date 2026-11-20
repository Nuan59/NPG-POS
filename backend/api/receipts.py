"""
✅ ทะเบียนใบเสร็จรับเงินชั่วคราว (เมนู ใบเสร็จ & ประวัติรถ)

นโยบายร้าน: รับเงินทุกครั้งต้องมีใบเสร็จ
- ใบเสร็จรับเงิน      = ขายรถ (หน้าเอกสารรายการขาย) - ไม่อยู่ในทะเบียนนี้
- ใบเสร็จชั่วคราว     = ทุกอย่างที่เหลือ → จดลงทะเบียนนี้ทุกใบ
    S-00000001  งานซ่อม / ต่อภาษี+พรบ / อื่นๆ / ขายอะไหล่   (ServiceRecord)
    MO-00001    ค่างวด NPG / ปิดบัญชี                         (NPGPayment)
    MF-00001    ค่าธรรมเนียม NPG                              (NPGFee)

เก็บประวัติถาวร: ลบรายการต้นทาง → ใบเสร็จไม่หาย แค่เปลี่ยนเป็น "ยกเลิก" (ใคร / เมื่อไหร่)
แก้ยอดต้นทาง (เช่น adm แก้ค่างวด) → ทะเบียนอัปเดตตาม
ตารางสร้างเองตอนใช้ครั้งแรก + เติมใบเก่าที่มีอยู่แล้วให้ครบ (ไม่ต้องรัน /dev/)
บันทึกพัง → ไม่กระทบการรับเงินจริง
"""
import threading
import traceback
from decimal import Decimal

from django.db import connection
from django.utils import timezone

TABLE = "receipt_log"
_ready = False
_lock = threading.Lock()

KIND_LABEL = {"service": "งานบริการ", "npg_payment": "ค่างวด NPG", "npg_fee": "ค่าธรรมเนียม NPG"}


def ensure_tables():
    global _ready
    if _ready:
        return
    with _lock:
        if _ready:
            return
        pg = connection.vendor == "postgresql"
        pk = "BIGSERIAL PRIMARY KEY" if pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
        ts = "TIMESTAMPTZ" if pg else "TIMESTAMP"
        with connection.cursor() as c:
            c.execute(f"""
                CREATE TABLE IF NOT EXISTS {TABLE} (
                    id {pk},
                    number VARCHAR(30) NOT NULL,
                    kind VARCHAR(20) NOT NULL,
                    ref_id BIGINT NOT NULL,
                    receipt_date DATE NULL,
                    category VARCHAR(60) NOT NULL DEFAULT '',
                    customer VARCHAR(255) NOT NULL DEFAULT '',
                    description VARCHAR(500) NOT NULL DEFAULT '',
                    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
                    payment_method VARCHAR(100) NOT NULL DEFAULT '',
                    created_by VARCHAR(150) NOT NULL DEFAULT '',
                    link VARCHAR(255) NOT NULL DEFAULT '',
                    bike_id BIGINT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    cancelled_at {ts} NULL,
                    cancelled_by VARCHAR(150) NOT NULL DEFAULT '',
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            c.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS receipt_log_ref_idx ON {TABLE} (kind, ref_id)")
            c.execute(f"CREATE INDEX IF NOT EXISTS receipt_log_date_idx ON {TABLE} (receipt_date)")
        _ready = True
    try:
        backfill()
    except Exception:
        traceback.print_exc()


# ---------------------------------------------------------------- สร้างข้อมูลจากรายการต้นทาง

def _service_row(r):
    label = r.transaction_type_detail if r.transaction_type == "อื่นๆ" and r.transaction_type_detail else r.transaction_type
    items = ", ".join(str(i.get("description", "")) for i in (r.items or []) if i.get("description"))
    bike = r.bike
    bike_txt = f" · {bike.model_name}{' ' + bike.registration_plate if getattr(bike, 'registration_plate', '') else ''}" if bike else ""
    return dict(
        number=f"S-{r.id:08d}", kind="service", ref_id=r.id, receipt_date=r.service_date, category=label or "",
        customer=r.customer.name if r.customer else "ลูกค้าหน้าร้าน",
        description=(items + bike_txt)[:500], amount=Decimal(str(r.total or 0)), payment_method=r.payment_type or "",
        created_by=r.created_by or "", link=f"/service-history/{r.id}/TempReceipt", bike_id=r.bike_id,
    )


def _npg_customer(account):
    order = account.order if account else None
    return order.customer.name if order and order.customer else "-"


def _payment_row(p):
    acc = p.account
    is_close = (p.note or "").startswith("ปิดบัญชี")
    desc = f"ปิดบัญชี NPG #{acc.id}" if is_close else f"ค่างวด NPG #{acc.id} งวดที่ {p.installment_number}"
    if p.late_fee:
        desc += f" + ค่าปรับ {Decimal(str(p.late_fee)):,.0f}"
    user = p.created_by
    bike = acc.order.bikes.first() if acc.order_id else None
    return dict(
        number=f"MO-{p.id:05d}", kind="npg_payment", ref_id=p.id, receipt_date=p.payment_date,
        category="ปิดบัญชี NPG" if is_close else "ค่างวด NPG", customer=_npg_customer(acc), description=desc[:500],
        amount=Decimal(str(p.amount_paid or 0)) + Decimal(str(p.late_fee or 0)), payment_method=p.payment_method or "",
        created_by=(getattr(user, "name", "") or getattr(user, "username", "")) if user else "",
        link=f"/npg/{acc.id}/receipt?payment_id={p.id}", bike_id=bike.id if bike else None,
    )


def _fee_row(f):
    acc = f.account
    return dict(
        number=f"MF-{f.id:05d}", kind="npg_fee", ref_id=f.id, receipt_date=f.fee_date, category="ค่าธรรมเนียม NPG",
        customer=_npg_customer(acc), description=f"{f.description} · NPG #{acc.id}"[:500],
        amount=Decimal(str(f.amount or 0)), payment_method=f.payment_method or "", created_by=f.created_by or "",
        link=f"/npg/{acc.id}/receipt?fee_id={f.id}", bike_id=None,
    )


BUILDERS = {"service": _service_row, "npg_payment": _payment_row, "npg_fee": _fee_row}
COLS = ["number", "kind", "ref_id", "receipt_date", "category", "customer", "description", "amount",
        "payment_method", "created_by", "link", "bike_id"]


def _upsert(row):
    with connection.cursor() as c:
        c.execute(f"SELECT id FROM {TABLE} WHERE kind = %s AND ref_id = %s", [row["kind"], row["ref_id"]])
        hit = c.fetchone()
        vals = [row[k] for k in COLS]
        if hit:
            sets = ", ".join(f"{k} = %s" for k in COLS)
            c.execute(f"UPDATE {TABLE} SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = %s", vals + [hit[0]])
        else:
            c.execute(f"INSERT INTO {TABLE} ({', '.join(COLS)}) VALUES ({', '.join(['%s'] * len(COLS))})", vals)


def record(kind, obj):
    """ออก / อัปเดตใบเสร็จชั่วคราวของรายการนี้ (เรียกหลังรับเงิน / แก้ยอด)"""
    global _ready
    for attempt in (1, 2):
        try:
            ensure_tables()
            _upsert(BUILDERS[kind](obj))
            return
        except Exception:
            if attempt == 2:
                traceback.print_exc()
            _ready = False  # ตารางหาย (เช่น DB ถูกรีเซ็ต) → สร้างใหม่แล้วลองอีกครั้ง


def cancel(kind, ref_id, user=""):
    """รายการต้นทางถูกลบ → ใบเสร็จยังอยู่ แต่เป็น 'ยกเลิก'"""
    try:
        ensure_tables()
        with connection.cursor() as c:
            c.execute(
                f"UPDATE {TABLE} SET status = 'cancelled', cancelled_at = %s, cancelled_by = %s, updated_at = CURRENT_TIMESTAMP "
                f"WHERE kind = %s AND ref_id = %s AND status = 'active'",
                [timezone.now(), (user or "")[:150], kind, ref_id],
            )
    except Exception:
        traceback.print_exc()


def backfill():
    """เติมใบเสร็จของรายการเก่าที่ยังไม่อยู่ในทะเบียน (รันครั้งแรกที่ระบบเปิด)"""
    from api.models import NPGPayment
    from api.models.ServiceRecord import ServiceRecord
    with connection.cursor() as c:
        c.execute(f"SELECT kind, ref_id FROM {TABLE}")
        have = {(k, int(r)) for k, r in c.fetchall()}
    for r in ServiceRecord.objects.select_related("customer", "bike").exclude(id__in=[i for k, i in have if k == "service"]):
        _upsert(_service_row(r))
    for p in NPGPayment.objects.select_related("account__order__customer", "created_by").exclude(
            id__in=[i for k, i in have if k == "npg_payment"]):
        _upsert(_payment_row(p))
    try:
        from api.models.NPGPayment import NPGFee
        for f in NPGFee.objects.select_related("account__order__customer").exclude(
                id__in=[i for k, i in have if k == "npg_fee"]):
            _upsert(_fee_row(f))
    except Exception:
        traceback.print_exc()  # ตาราง npg_fees ยังไม่ได้สร้าง
