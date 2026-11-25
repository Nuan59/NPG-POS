"""
✅ ใบกำกับภาษีซื้อ (นำเข้า) - ใบที่ร้านได้รับจากผู้ขาย (เช่น ซื้อรถเข้า ซื้ออะไหล่) ใช้หักภาษีขาย
- พนักงานบันทึกได้ / adm ยกเลิก (ใบยังอยู่ ไม่หาย)
- เดือนภาษี (tax_year / tax_month) = เดือนที่นำไปใช้ยื่น (ค่าตั้งต้น = เดือนของวันที่ในใบ)
ตารางสร้างเองตอนใช้ครั้งแรก (raw SQL ไม่ผ่าน migration)
"""
import threading
from decimal import ROUND_HALF_UP, Decimal

from django.db import connection

TABLE = "input_tax_invoice"
_ready = False
_lock = threading.Lock()

COLS = ["id", "invoice_date", "tax_year", "tax_month", "supplier_name", "supplier_tax_id", "supplier_branch",
        "invoice_no", "description", "base_amount", "vat_amount", "amount", "note", "status", "created_by",
        "created_by_username", "created_at", "cancelled_at", "cancelled_by", "cancel_reason"]


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
                    invoice_date DATE NOT NULL,
                    tax_year INTEGER NOT NULL,
                    tax_month INTEGER NOT NULL,
                    supplier_name VARCHAR(255) NOT NULL,
                    supplier_tax_id VARCHAR(20) NOT NULL DEFAULT '',
                    supplier_branch VARCHAR(100) NOT NULL DEFAULT '',
                    invoice_no VARCHAR(60) NOT NULL,
                    description VARCHAR(500) NOT NULL DEFAULT '',
                    base_amount NUMERIC(12,2) NOT NULL,
                    vat_amount NUMERIC(12,2) NOT NULL,
                    amount NUMERIC(12,2) NOT NULL,
                    note VARCHAR(500) NOT NULL DEFAULT '',
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    created_by VARCHAR(150) NOT NULL DEFAULT '',
                    created_by_username VARCHAR(150) NOT NULL DEFAULT '',
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    cancelled_at {ts} NULL,
                    cancelled_by VARCHAR(150) NOT NULL DEFAULT '',
                    cancel_reason VARCHAR(500) NOT NULL DEFAULT ''
                )
            """)
            c.execute(f"CREATE INDEX IF NOT EXISTS input_tax_period_idx ON {TABLE} (tax_year, tax_month)")
        _ready = True


def q2(x):
    return Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def _rows(c):
    cols = [x[0] for x in c.description]
    out = []
    for r in c.fetchall():
        d = dict(zip(cols, r))
        for k in ("base_amount", "vat_amount", "amount"):
            d[k] = float(d[k] or 0)
        for k in ("invoice_date", "created_at", "cancelled_at"):
            v = d.get(k)
            d[k] = v.isoformat() if hasattr(v, "isoformat") else v
        out.append(d)
    return out


def select(where="", params=None, limit=500):
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"SELECT {', '.join(COLS)} FROM {TABLE} {where} ORDER BY invoice_date DESC, id DESC LIMIT %s",
                  (params or []) + [limit])
        return _rows(c)


def get(pk):
    r = select("WHERE id = %s", [pk], 1)
    return r[0] if r else None


def duplicate(supplier_tax_id, invoice_no, supplier_name):
    """ใบเดิม (ผู้ขายเดียวกัน + เลขที่เดียวกัน) ที่ยังใช้งานอยู่ - กันบันทึกซ้ำ"""
    key, val = ("supplier_tax_id", supplier_tax_id) if supplier_tax_id else ("LOWER(supplier_name)", supplier_name.lower())
    r = select(f"WHERE status = 'active' AND LOWER(invoice_no) = %s AND {key} = %s", [invoice_no.lower(), val], 1)
    return r[0] if r else None


def insert(d):
    ensure_tables()
    vals = [d["invoice_date"], d["tax_year"], d["tax_month"], d["supplier_name"][:255], d["supplier_tax_id"][:20],
            d["supplier_branch"][:100], d["invoice_no"][:60], d["description"][:500], d["base_amount"],
            d["vat_amount"], d["amount"], d["note"][:500], d["created_by"][:150], d["created_by_username"][:150]]
    with connection.cursor() as c:
        c.execute(
            f"INSERT INTO {TABLE} (invoice_date, tax_year, tax_month, supplier_name, supplier_tax_id, supplier_branch, "
            f"invoice_no, description, base_amount, vat_amount, amount, note, created_by, created_by_username) "
            f"VALUES ({', '.join(['%s'] * len(vals))})", vals)
        c.execute(f"SELECT MAX(id) FROM {TABLE} WHERE invoice_no = %s", [d["invoice_no"][:60]])
        return get(c.fetchone()[0])


def cancel(pk, user, reason):
    from django.utils import timezone
    ensure_tables()
    with connection.cursor() as c:
        c.execute(f"UPDATE {TABLE} SET status = 'cancelled', cancelled_at = %s, cancelled_by = %s, cancel_reason = %s "
                  f"WHERE id = %s AND status = 'active'", [timezone.now(), user[:150], reason[:500], pk])
        return c.rowcount > 0
