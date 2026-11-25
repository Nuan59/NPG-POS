"""
✅ เพิ่มคอลัมน์ใหม่ให้ตารางที่สร้างด้วย raw SQL (ไม่ผ่าน migration) อัตโนมัติ ครั้งแรกที่มีคำขอเข้ามา
ไม่ต้องไปเปิด /dev/... เอง - ทำครั้งเดียวต่อ process (เช็คแล้วจำไว้) / พังก็ไม่กระทบคำขอ

  npg_fees.cash_amount    ยอดเงินสด (แบ่งจ่าย เงินสด + โอน)
  npg_fees.transfer_bank  ธนาคารที่โอน
  tax_invoice.receiver_name  ผู้รับ (คนมารับรถ/ใบ ไม่ใช่ผู้ซื้อเสมอไป)
"""
import threading
import traceback

from django.db import connection

COLUMNS = [
    ("npg_fees", "cash_amount", "NUMERIC(12,2) NULL"),
    ("npg_fees", "transfer_bank", "VARCHAR(100) NOT NULL DEFAULT ''"),
    ("tax_invoice", "receiver_name", "VARCHAR(255) NOT NULL DEFAULT ''"),
]

_done = False
_lock = threading.Lock()


def ensure_columns():
    global _done
    if _done:
        return
    with _lock:
        if _done:
            return
        try:
            existing_tables = set(connection.introspection.table_names())
            with connection.cursor() as c:
                for table, col, ddl in COLUMNS:
                    if table not in existing_tables:
                        continue  # ยังไม่ได้สร้างตาราง - ข้าม
                    cols = {x.name for x in connection.introspection.get_table_description(c, table)}
                    if col not in cols:
                        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
            _done = True
        except Exception:
            traceback.print_exc()


class SchemaGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ensure_columns()
        return self.get_response(request)
