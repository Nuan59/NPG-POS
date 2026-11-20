"""
✅ ตัวจัดการสต็อกอะไหล่ - ทุกการเข้า/ออกผ่านไฟล์นี้ (ยอดคงเหลือ + ประวัติตรงกันเสมอ)
"""
import threading
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from django.db import connection, transaction
from django.db.models import Max
from django.utils import timezone

from api.models.Parts import Part, PartMovement

_ready = False
_lock = threading.Lock()


class StockError(ValueError):
    """ของไม่พอ / ข้อมูลผิด - ข้อความภาษาไทยส่งกลับให้ผู้ใช้ได้เลย"""


def D(value, default="0"):
    try:
        return Decimal(str(value if value not in (None, "") else default))
    except (InvalidOperation, ValueError):
        raise StockError(f"ตัวเลขไม่ถูกต้อง: {value}")


def fmt(x):
    x = Decimal(str(x or 0))
    return f"{x:,.0f}" if x == x.to_integral_value() else f"{x:,.2f}"


def ensure_tables():
    """สร้างตาราง part / part_movement ถ้ายังไม่มี (เรียกซ้ำได้ ไม่ต้องรัน /dev/)"""
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
                CREATE TABLE IF NOT EXISTS part (
                    id {pk},
                    code VARCHAR(50) NOT NULL DEFAULT '',
                    name VARCHAR(200) NOT NULL,
                    fits VARCHAR(255) NOT NULL DEFAULT '',
                    unit VARCHAR(20) NOT NULL DEFAULT 'ชิ้น',
                    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
                    price NUMERIC(12,2) NOT NULL DEFAULT 0,
                    wholesale_price NUMERIC(12,2) NULL,
                    qty NUMERIC(12,2) NOT NULL DEFAULT 0,
                    min_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
                    location VARCHAR(100) NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            c.execute(f"""
                CREATE TABLE IF NOT EXISTS part_movement (
                    id {pk},
                    part_id BIGINT NOT NULL,
                    kind VARCHAR(20) NOT NULL,
                    qty NUMERIC(12,2) NOT NULL,
                    qty_after NUMERIC(12,2) NOT NULL DEFAULT 0,
                    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
                    unit_price NUMERIC(12,2) NULL,
                    ref_type VARCHAR(20) NOT NULL DEFAULT '',
                    ref_id BIGINT NULL,
                    supplier VARCHAR(200) NOT NULL DEFAULT '',
                    bill_no VARCHAR(100) NOT NULL DEFAULT '',
                    note VARCHAR(255) NOT NULL DEFAULT '',
                    created_by VARCHAR(150) NOT NULL DEFAULT '',
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            c.execute("CREATE INDEX IF NOT EXISTS part_name_idx ON part (name)")
            c.execute("CREATE INDEX IF NOT EXISTS part_movement_part_idx ON part_movement (part_id, created_at)")
            c.execute("CREATE INDEX IF NOT EXISTS part_movement_ref_idx ON part_movement (ref_type, ref_id)")
        _ready = True


def _move(part, kind, qty, user="", **kw):
    """บันทึก 1 การเคลื่อนไหว + อัปเดตยอดคงเหลือ (part ต้อง lock มาแล้ว)"""
    part.qty = D(part.qty) + qty
    part.save(update_fields=["qty", "cost", "updated_at"])
    return PartMovement.objects.create(
        part=part, kind=kind, qty=qty, qty_after=part.qty,
        unit_cost=kw.pop("unit_cost", part.cost), created_by=user or "", **kw,
    )


def receive(part_id, qty, unit_cost, user="", supplier="", bill_no="", note=""):
    """รับอะไหล่เข้า - ราคาทุนคิดแบบเฉลี่ย"""
    qty, unit_cost = D(qty), D(unit_cost)
    if qty <= 0:
        raise StockError("จำนวนต้องมากกว่า 0")
    if unit_cost < 0:
        raise StockError("ราคาทุนต้องไม่ติดลบ")
    with transaction.atomic():
        part = Part.objects.select_for_update().get(pk=part_id)
        old_qty = max(D(part.qty), Decimal("0"))
        total = old_qty + qty
        part.cost = ((old_qty * D(part.cost) + qty * unit_cost) / total).quantize(Decimal("0.01")) if total > 0 else unit_cost
        return part, _move(part, "in", qty, user, unit_cost=unit_cost, supplier=supplier[:200],
                           bill_no=bill_no[:100], note=note[:255])


def adjust(part_id, new_qty, reason, user=""):
    """ตรวจนับ - ตั้งยอดคงเหลือใหม่ บันทึกส่วนต่าง"""
    new_qty = D(new_qty)
    if new_qty < 0:
        raise StockError("ยอดคงเหลือต้องไม่ติดลบ")
    if not (reason or "").strip():
        raise StockError("กรุณาใส่เหตุผล เช่น นับสต็อก ของเสีย ของหาย")
    with transaction.atomic():
        part = Part.objects.select_for_update().get(pk=part_id)
        diff = new_qty - D(part.qty)
        if diff == 0:
            return part, None
        return part, _move(part, "adjust", diff, user, note=reason.strip()[:255])


def consume(items, kind, ref_type, ref_id, user=""):
    """
    ตัดสต็อกจากรายการขาย/งานซ่อม - items = [{part_id, qty, amount}]
    ของไม่พอ → StockError (ต้องเรียกใน transaction.atomic เพื่อ rollback ทั้งรายการ)
    """
    for it in items:
        qty = D(it.get("qty") or 1)
        if qty <= 0:
            raise StockError("จำนวนอะไหล่ต้องมากกว่า 0")
        part = Part.objects.select_for_update().filter(pk=it["part_id"], active=True).first()
        if not part:
            raise StockError("ไม่พบอะไหล่ในสต็อก (อาจถูกปิดไปแล้ว)")
        if D(part.qty) < qty:
            raise StockError(f"{part.name} เหลือ {fmt(part.qty)} {part.unit} ไม่พอ {fmt(qty)}")
        unit_price = (D(it.get("amount")) / qty).quantize(Decimal("0.01")) if it.get("amount") else D(part.price)
        _move(part, kind, -qty, user, unit_price=unit_price, ref_type=ref_type, ref_id=ref_id)


def restore(ref_type, ref_id, user=""):
    """ลบรายการ → คืนอะไหล่ทุกชิ้นของรายการนั้นเข้าสต็อก"""
    with transaction.atomic():
        moved = list(PartMovement.objects.filter(ref_type=ref_type, ref_id=ref_id))
        net = {}
        for m in moved:
            net[m.part_id] = net.get(m.part_id, Decimal("0")) + D(m.qty)
        for part_id, q in net.items():
            if q >= 0:
                continue  # คืนครบแล้ว
            part = Part.objects.select_for_update().filter(pk=part_id).first()
            if part:
                _move(part, "return", -q, user, ref_type=ref_type, ref_id=ref_id, note="ลบรายการ คืนเข้าสต็อก")


def post_purchase_expense(movement, part, user=""):
    """✅ รับเข้าแล้วจ่ายเงินสด → ลงรายจ่ายในส่วนเงินสดวันนี้ (แถวอัตโนมัติ ชี้กลับไปที่การรับเข้า)"""
    from api.models.Cashflow import CashflowEntry
    total = (D(movement.qty) * D(movement.unit_cost)).quantize(Decimal("0.01"))
    if total <= 0:
        return None
    today = timezone.localtime(timezone.now(), ZoneInfo("Asia/Bangkok")).date()
    next_seq = (CashflowEntry.objects.filter(date=today, section="cash").aggregate(m=Max("seq"))["m"] or -1) + 1
    desc = f"ซื้ออะไหล่ · {part.name} x{fmt(movement.qty)}"
    if movement.supplier:
        desc += f" · {movement.supplier}"
    return CashflowEntry.objects.create(
        date=today, section="cash", seq=next_seq, description=desc[:255], expense=total,
        created_by=user or "", auto_source="part_in", auto_source_id=movement.id,
    )
