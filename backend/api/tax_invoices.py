"""
✅ ใบกำกับภาษี (ขายรถ) - เลขที่รันต่อเนื่อง INV-000001 ไม่เริ่มใหม่ ไม่ข้าม ไม่ซ้ำ
- ราคาที่ขาย = ราคาสุทธิ (รวม VAT แล้ว) → ถอด VAT ย้อนกลับ: มูลค่าสินค้า = ยอด x 100/107, VAT = ยอด - มูลค่าสินค้า
- 1 รายการขายมีใบที่ใช้งานได้ 1 ใบ / ยกเลิก (adm) แล้วใบยังอยู่ เลขไม่ถูกเอาไปใช้ซ้ำ ออกใหม่ได้เลขถัดไป
- เก็บ ผู้รับ (ผู้ซื้อ) / ผู้ออก (พนักงานที่กดออก) / วันที่ออก ไว้ในใบ (แก้ข้อมูลลูกค้าทีหลัง ใบเดิมไม่เปลี่ยน)
ตารางสร้างเองตอนใช้ครั้งแรก (raw SQL ไม่ผ่าน migration)
"""
import threading
from decimal import ROUND_HALF_UP, Decimal

from django.db import connection, transaction

TABLE = "tax_invoice"
COUNTER = "tax_invoice_counter"
VAT_RATE = Decimal("7")
_ready = False
_lock = threading.Lock()

COLS = ["id", "number", "seq", "order_id", "status", "issue_date", "buyer_name", "buyer_address", "buyer_tax_id",
        "buyer_branch", "buyer_phone", "item_description", "amount", "base_amount", "vat_amount", "vat_rate",
        "issued_by", "issued_by_username", "created_at", "cancelled_at", "cancelled_by", "cancel_reason"]


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
                    number VARCHAR(20) NOT NULL,
                    seq BIGINT NOT NULL,
                    order_id BIGINT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    issue_date DATE NOT NULL,
                    buyer_name VARCHAR(255) NOT NULL DEFAULT '',
                    buyer_address VARCHAR(500) NOT NULL DEFAULT '',
                    buyer_tax_id VARCHAR(20) NOT NULL DEFAULT '',
                    buyer_branch VARCHAR(100) NOT NULL DEFAULT '',
                    buyer_phone VARCHAR(30) NOT NULL DEFAULT '',
                    item_description VARCHAR(500) NOT NULL DEFAULT '',
                    amount NUMERIC(12,2) NOT NULL,
                    base_amount NUMERIC(12,2) NOT NULL,
                    vat_amount NUMERIC(12,2) NOT NULL,
                    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 7,
                    issued_by VARCHAR(150) NOT NULL DEFAULT '',
                    issued_by_username VARCHAR(150) NOT NULL DEFAULT '',
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    cancelled_at {ts} NULL,
                    cancelled_by VARCHAR(150) NOT NULL DEFAULT '',
                    cancel_reason VARCHAR(500) NOT NULL DEFAULT ''
                )
            """)
            c.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS tax_invoice_seq_idx ON {TABLE} (seq)")
            c.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS tax_invoice_number_idx ON {TABLE} (number)")
            c.execute(f"CREATE INDEX IF NOT EXISTS tax_invoice_order_idx ON {TABLE} (order_id)")
            # ตัวนับเลขที่ 1 แถว - ล็อกแถวนี้ตอนออกใบ กันสองคนกดพร้อมกันได้เลขซ้ำ
            c.execute(f"CREATE TABLE IF NOT EXISTS {COUNTER} (id INTEGER PRIMARY KEY, last_seq BIGINT NOT NULL)")
            c.execute(f"SELECT COUNT(*) FROM {COUNTER}")
            if c.fetchone()[0] == 0:
                c.execute(f"SELECT COALESCE(MAX(seq), 0) FROM {TABLE}")
                c.execute(f"INSERT INTO {COUNTER} (id, last_seq) VALUES (1, %s)", [c.fetchone()[0]])
        _ready = True


def split_vat(amount):
    """ยอดรวม VAT → (มูลค่าสินค้า, VAT) ปัด 2 ตำแหน่ง - มูลค่า + VAT = ยอดเสมอ"""
    amount = Decimal(str(amount)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    base = (amount * 100 / (100 + VAT_RATE)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return amount, base, amount - base


def fmt_number(seq):
    return f"INV-{seq:06d}"


def _row(c):
    cols = [x[0] for x in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _clean(r):
    for k in ("amount", "base_amount", "vat_amount", "vat_rate"):
        r[k] = float(r[k] or 0)
    for k in ("issue_date", "created_at", "cancelled_at"):
        v = r.get(k)
        r[k] = v.isoformat() if hasattr(v, "isoformat") else v
    return r


def list_for_order(order_id):
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"SELECT {', '.join(COLS)} FROM {TABLE} WHERE order_id = %s ORDER BY seq DESC", [order_id])
        return [_clean(r) for r in _row(c)]


def list_all(where="", params=None, limit=200):
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"SELECT {', '.join(COLS)} FROM {TABLE} {where} ORDER BY seq DESC LIMIT %s", (params or []) + [limit])
        return [_clean(r) for r in _row(c)]


def get(inv_id):
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"SELECT {', '.join(COLS)} FROM {TABLE} WHERE id = %s", [inv_id])
        rows = _row(c)
    return _clean(rows[0]) if rows else None


def active_for_order(order_id):
    return next((r for r in list_for_order(order_id) if r["status"] == "active"), None)


def issue(order_id, data):
    """ออกใบใหม่ (เรียกหลังเช็คสิทธิ์/ข้อมูลแล้ว) → dict ของใบ"""
    ensure_tables()
    amount, base, vat = split_vat(data["amount"])
    with transaction.atomic():
        with connection.cursor() as c:
            lock = " FOR UPDATE" if connection.vendor == "postgresql" else ""
            c.execute(f"SELECT last_seq FROM {COUNTER} WHERE id = 1{lock}")
            seq = int(c.fetchone()[0]) + 1
            c.execute(f"UPDATE {COUNTER} SET last_seq = %s WHERE id = 1", [seq])
            vals = [fmt_number(seq), seq, order_id, "active", data["issue_date"], data["buyer_name"][:255],
                    data["buyer_address"][:500], data["buyer_tax_id"][:20], data["buyer_branch"][:100],
                    data["buyer_phone"][:30], data["item_description"][:500], amount, base, vat, VAT_RATE,
                    data["issued_by"][:150], data["issued_by_username"][:150]]
            c.execute(
                f"INSERT INTO {TABLE} (number, seq, order_id, status, issue_date, buyer_name, buyer_address, buyer_tax_id, "
                f"buyer_branch, buyer_phone, item_description, amount, base_amount, vat_amount, vat_rate, issued_by, "
                f"issued_by_username) VALUES ({', '.join(['%s'] * len(vals))})", vals)
            c.execute(f"SELECT id FROM {TABLE} WHERE seq = %s", [seq])
            new_id = c.fetchone()[0]
    return get(new_id)


def cancel(inv_id, user, reason):
    from django.utils import timezone
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"UPDATE {TABLE} SET status = 'cancelled', cancelled_at = %s, cancelled_by = %s, cancel_reason = %s "
                  f"WHERE id = %s AND status = 'active'", [timezone.now(), user[:150], reason[:500], inv_id])
        return c.rowcount > 0
