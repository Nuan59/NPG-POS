"""
✅ บันทึกการทำงานของพนักงาน (Activity Log)

- ทุกครั้งที่มีการ เพิ่ม / แก้ / ลบ ข้อมูลผ่าน API (POST / PUT / PATCH / DELETE) ระบบบันทึกให้เอง:
  ใคร · ทำอะไร · เมื่อไหร่ · สำเร็จไหม (status) · ข้อมูลที่ส่งมา (ตัดรหัสผ่าน/token ออก) · IP
- งานสำคัญเรื่องเงินเขียนรายละเอียดเพิ่มเป็นภาษาไทยผ่าน note(request, "...") เช่น ยอดก่อน → หลังแก้
- ตารางสร้างตัวเองตอนใช้ครั้งแรก (ไม่ต้องเรียก /dev/ และไม่ผ่าน migration - เหมือนตารางอื่นในโปรเจกต์)
- บันทึกนี้ไม่มี API แก้/ลบ (กันลบหลักฐาน) / บันทึกพัง → ไม่กระทบงานจริงของพนักงาน
"""
import json
import re
import threading
import time
import traceback

from django.db import connection

TABLE = "activity_log"
_table_ready = False
_lock = threading.Lock()

ADMIN_ROLES = {"adm", "admin", "administrator"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# ไม่ต้องบันทึก (ต่ออายุ token อัตโนมัติทุกชั่วโมง / เครื่องมือ dev)
SKIP_PATHS = [
    re.compile(r"^/auth/token/refresh/?$"),
    re.compile(r"^/admin/"),
    re.compile(r"^/static/"),
]

# ฟิลด์ที่ห้ามเก็บค่าจริง
SECRET_KEYS = re.compile(r"pass|token|secret|refresh|access|otp|pin", re.I)
MAX_PAYLOAD = 2000

# ✅ ชื่องานภาษาไทยตาม path + method (ตัวแรกที่ตรงชนะ)
ACTIONS = [
    (r"^/(login|auth/token)/?$", "POST", "เข้าสู่ระบบ"),
    (r"^/tax-invoices/?$", "POST", "ออกใบกำกับภาษี"),
    (r"^/tax-invoices/\d+/cancel/?$", "POST", "ยกเลิกใบกำกับภาษี"),
    (r"^/auth/logout/?$", "POST", "ออกจากระบบ"),
    # ขาย
    (r"^/order/?$", "POST", "ทำรายการขาย"),
    (r"^/order/\d+/checklist_finish/?$", "POST", "จบรายการขาย (ตัดขาย)"),
    (r"^/order/\d+/checklist/?$", "POST", "ติ๊กเช็คลิสต์หลังขาย"),
    (r"^/order/\d+/checklist/?$", "DELETE", "เอาติ๊กเช็คลิสต์ออก"),
    (r"^/order/\d+/down_payment/?$", "POST", "สร้างบัญชีผ่อนดาวน์ย้อนหลัง"),
    (r"^/order/\d+/?$", "PUT|PATCH", "แก้ไขรายการขาย"),
    (r"^/order/\d+/?$", "DELETE", "ลบรายการขาย"),
    (r"^/service/?$", "POST", "บันทึกงานซ่อม / ขายอะไหล่"),
    (r"^/service/\d+/?$", "PUT|PATCH", "แก้ไขงานบริการ"),
    (r"^/service/\d+/?$", "DELETE", "ลบงานบริการ"),
    # อะไหล่
    (r"^/parts/?$", "POST", "เพิ่มอะไหล่"),
    (r"^/parts/\d+/receive/?$", "POST", "รับอะไหล่เข้า"),
    (r"^/parts/\d+/adjust/?$", "POST", "ปรับยอดอะไหล่"),
    (r"^/parts/\d+/?$", "PATCH|PUT", "แก้ไขอะไหล่"),
    (r"^/parts/\d+/?$", "DELETE", "ปิดอะไหล่"),
    # NPG
    (r"^/npg/accounts/\d+/record_payment/?$", "POST", "รับชำระค่างวด NPG"),
    (r"^/npg/accounts/\d+/close_account/?$", "POST", "ปิดบัญชี NPG"),
    (r"^/npg/accounts/\d+/add_fee/?$", "POST", "บันทึกค่าธรรมเนียม NPG"),
    (r"^/npg/accounts/\d+/delete_fee/\d+/?$", "DELETE", "ลบค่าธรรมเนียม NPG"),
    (r"^/npg/payments/\d+/edit/?$", "PATCH", "แก้ไขรายการชำระ NPG"),
    (r"^/npg/payments/\d+/delete_payment/?$", "DELETE", "ลบรายการชำระ NPG"),
    (r"^/npg/accounts/\d+/?$", "PUT|PATCH", "แก้ไขบัญชี NPG"),
    (r"^/npg/accounts/\d+/?$", "DELETE", "ลบบัญชี NPG"),
    # เงิน
    (r"^/cashflow/save_day/?$", "POST", "บันทึกรายรับ-รายจ่าย"),
    (r"^/cashflow/record_count/?$", "POST", "บันทึกนับเงินสดปลายวัน"),
    (r"^/cash-handover/send-now/?$", "POST", "ส่งเงินสด"),
    (r"^/cash-handover/submit/?$", "POST", "ส่งเงินสด (ใบส่งเงิน)"),
    (r"^/cash-handover/receive-direct/?$", "POST", "รับเงินแทนพนักงาน"),
    (r"^/cash-handover/\d+/receive/?$", "POST", "รับเงินที่ส่งมา"),
    (r"^/cash-handover/\d+/edit-received/?$", "POST", "แก้ยอดเงินที่รับแล้ว"),
    (r"^/cash-handover/\d+/edit-item/?$", "POST", "แก้ยอดรายการในใบส่งเงิน"),
    (r"^/cash-handover/\d+/remove-item/?$", "POST", "เอารายการออกจากใบส่งเงิน"),
    (r"^/cash-handover/\d+/unreceive/?$", "POST", "ยกเลิกการรับเงิน"),
    (r"^/cash-handover/\d+/cancel-send/?$", "POST", "ยกเลิกการส่งเงิน"),
    (r"^/cash-handover/\d+/cancel/?$", "POST", "ยกเลิกใบส่งเงิน"),
    (r"^/cash-handover/set-cash-amount/?$", "POST", "แก้ยอดเงินสดของรายการ"),
    (r"^/cash-handover/exclude/?$", "POST", "ตัดรายการออก ไม่ต้องส่งเงิน"),
    (r"^/expense-requests/?$", "POST", "ขอเบิกจ่าย"),
    (r"^/expense-requests/\d+/approve/?$", "POST", "อนุมัติเบิกจ่าย"),
    (r"^/expense-requests/\d+/reject/?$", "POST", "ไม่อนุมัติเบิกจ่าย"),
    # สต็อก / ลูกค้า / พนักงาน
    (r"^/inventory/?$", "POST", "เพิ่มรถเข้าสต็อก"),
    (r"^/inventory/\d+/?$", "PUT|PATCH", "แก้ไขข้อมูลรถ"),
    (r"^/inventory/\d+/?$", "DELETE", "ลบรถ"),
    (r"^/inventory/\d+/transfer/?$", "POST", "ย้ายรถไปคลังอื่น"),
    (r"^/inventory/.*import", "POST", "นำเข้าสต็อกรถ"),
    (r"^/customers/?$", "POST", "เพิ่มลูกค้า"),
    (r"^/customers/\d+/?$", "PUT|PATCH", "แก้ไขข้อมูลลูกค้า"),
    (r"^/customers/\d+/?$", "DELETE", "ลบลูกค้า"),
    (r"^/customers/import/?$", "POST", "นำเข้าลูกค้า"),
    (r"^/gifts/?$", "POST", "เพิ่มของแถม"),
    (r"^/gifts/\d+/?$", "PUT|PATCH|DELETE", "แก้ไข/ลบของแถม"),
    (r"^/employees/?$", "POST", "เพิ่มพนักงาน"),
    (r"^/employees/\d+/toggle_active/?$", "POST", "เปิด/ปิดบัญชีพนักงาน"),
    (r"^/employees/\d+/?$", "PUT|PATCH", "แก้ไขพนักงาน / สิทธิ์"),
    (r"^/employees/\d+/?$", "DELETE", "ลบพนักงาน"),
    (r"^/registration/\d+/update_status/?$", "PATCH", "อัปเดตสถานะทะเบียน"),
    (r"^/tasks/posts/\d+/checkin/?$", "POST", "เช็คอินงาน"),
    (r"^/tasks/", "POST|PUT|PATCH|DELETE", "จัดการงาน"),
    (r"^/announcements/", "POST|PUT|PATCH|DELETE", "จัดการประกาศ"),
    (r"^/issues/", "POST|PUT|PATCH|DELETE", "แจ้งปัญหา / อัปเดตปัญหา"),
    (r"^/work-hours/?$", "POST|PUT|PATCH", "ตั้งเวลาทำงาน"),
    (r"^/dev/", "GET|POST", "เครื่องมือผู้ดูแลระบบ (dev)"),
]
_ACTIONS = [(re.compile(p), set(m.split("|")), label) for p, m, label in ACTIONS]


def action_label(method, path):
    for pat, methods, label in _ACTIONS:
        if method in methods and pat.search(path):
            return label
    return {"POST": "เพิ่ม/ทำรายการ", "PUT": "แก้ไข", "PATCH": "แก้ไข", "DELETE": "ลบ"}.get(method, method)


def note(request, text):
    """✅ เขียนรายละเอียดเพิ่มให้รายการ log ของ request นี้ (เรียกจาก view ได้เลย หลายครั้งได้)"""
    try:
        raw = getattr(request, "_request", request)  # DRF Request → HttpRequest
        notes = getattr(raw, "_activity_notes", None)
        if notes is None:
            notes = []
            raw._activity_notes = notes
        if text:
            notes.append(str(text))
    except Exception:
        pass


def skip(request):
    """ไม่ต้องบันทึก request นี้ (เช่น auto-save ที่ไม่มีอะไรเปลี่ยน) - ถ้าพังยังบันทึกเหมือนเดิม"""
    try:
        getattr(request, "_request", request)._activity_skip = True
    except Exception:
        pass


def _redact(value, depth=0):
    if depth > 4:
        return "…"
    if isinstance(value, dict):
        return {k: ("***" if SECRET_KEYS.search(str(k)) else _redact(v, depth + 1)) for k, v in value.items()}
    if isinstance(value, list):
        out = [_redact(v, depth + 1) for v in value[:30]]
        if len(value) > 30:
            out.append(f"…(+{len(value) - 30})")
        return out
    if isinstance(value, str) and len(value) > 300:
        return value[:300] + "…"
    return value


def summarize_body(request_body, content_type):
    if "multipart" in (content_type or ""):
        return "(อัปโหลดไฟล์)"
    if not request_body:
        return ""
    try:
        data = json.loads(request_body.decode("utf-8"))
    except Exception:
        return ""
    try:
        text = json.dumps(_redact(data), ensure_ascii=False, default=str)
    except Exception:
        return ""
    return text[:MAX_PAYLOAD] + ("…" if len(text) > MAX_PAYLOAD else "")


def ensure_table():
    global _table_ready
    if _table_ready:
        return
    with _lock:
        if _table_ready:
            return
        pk = "BIGSERIAL PRIMARY KEY" if connection.vendor == "postgresql" else "INTEGER PRIMARY KEY AUTOINCREMENT"
        ts = "TIMESTAMPTZ" if connection.vendor == "postgresql" else "TIMESTAMP"
        with connection.cursor() as c:
            c.execute(f"""
                CREATE TABLE IF NOT EXISTS {TABLE} (
                    id {pk},
                    created_at {ts} NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    user_id BIGINT NULL,
                    username VARCHAR(150) NOT NULL DEFAULT '',
                    user_name VARCHAR(255) NOT NULL DEFAULT '',
                    role VARCHAR(20) NOT NULL DEFAULT '',
                    method VARCHAR(10) NOT NULL DEFAULT '',
                    path VARCHAR(300) NOT NULL DEFAULT '',
                    status INTEGER NOT NULL DEFAULT 0,
                    action VARCHAR(120) NOT NULL DEFAULT '',
                    detail TEXT NOT NULL DEFAULT '',
                    payload TEXT NOT NULL DEFAULT '',
                    ip VARCHAR(64) NOT NULL DEFAULT '',
                    duration_ms INTEGER NOT NULL DEFAULT 0
                )
            """)
            c.execute(f"CREATE INDEX IF NOT EXISTS activity_log_created_idx ON {TABLE} (created_at)")
            c.execute(f"CREATE INDEX IF NOT EXISTS activity_log_user_idx ON {TABLE} (user_id, created_at)")
        _table_ready = True


def write(*, user=None, username="", method="", path="", status=0, action="", detail="", payload="", ip="", duration_ms=0):
    """บันทึก 1 รายการ - พังก็เงียบ (ไม่ให้งานจริงพังเพราะ log) / ตารางหาย → สร้างใหม่แล้วลองอีกครั้ง"""
    global _table_ready
    for attempt in (1, 2):
        try:
            _insert(user, username, method, path, status, action, detail, payload, ip, duration_ms)
            return
        except Exception:
            _table_ready = False  # เช่น ตารางถูกสร้างใน transaction ที่ rollback ไป → สร้างใหม่รอบหน้า
            if attempt == 2:
                traceback.print_exc()


def _insert(user, username, method, path, status, action, detail, payload, ip, duration_ms):
    ensure_table()
    uid = getattr(user, "id", None) if user is not None else None
    uname = username or (getattr(user, "username", "") if user is not None else "")
    name = (getattr(user, "name", "") or "") if user is not None else ""
    role = (getattr(user, "role", "") or "") if user is not None else ""
    with connection.cursor() as c:
        c.execute(
            f"""INSERT INTO {TABLE}
                (user_id, username, user_name, role, method, path, status, action, detail, payload, ip, duration_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [uid, (uname or "")[:150], name[:255], str(role)[:20], method[:10], path[:300], int(status or 0),
             (action or "")[:120], detail or "", payload or "", (ip or "")[:64], int(duration_ms or 0)],
        )


def client_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def _jwt_user(request):
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        result = JWTAuthentication().authenticate(request)
        return result[0] if result else None
    except Exception:
        return None


class ActivityLogMiddleware:
    """เก็บ log ทุกคำขอที่เขียนข้อมูล (POST/PUT/PATCH/DELETE) หลังตอบกลับแล้ว"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in WRITE_METHODS or any(p.match(request.path) for p in SKIP_PATHS):
            return self.get_response(request)

        start = time.monotonic()
        body = b""
        # อ่าน body ก่อน view (อ่านหลังไม่ได้แล้ว) - ยกเว้นอัปโหลดไฟล์ (อ่านทั้งก้อนจะทำให้ไฟล์ใหญ่อัปไม่ได้)
        if "multipart" not in request.META.get("CONTENT_TYPE", ""):
            try:
                body = request.body
            except Exception:
                body = b""
        response = self.get_response(request)
        if getattr(request, "_activity_skip", False) and response.status_code < 400:
            return response

        try:
            path = request.path
            method = request.method
            user = _jwt_user(request)
            username = ""
            payload_text = summarize_body(body, request.META.get("CONTENT_TYPE", ""))
            if user is None and re.match(r"^/(login|auth/token)/?$", path):
                try:
                    username = str(json.loads(body.decode("utf-8")).get("username", ""))[:150]
                except Exception:
                    username = ""
                if response.status_code >= 400:
                    action = "เข้าสู่ระบบไม่สำเร็จ"
                else:
                    action = "เข้าสู่ระบบ"
            else:
                action = action_label(method, path)
            notes = getattr(request, "_activity_notes", None) or []
            detail = " / ".join(notes)
            if response.status_code >= 400:
                err = ""
                try:
                    data = json.loads(response.content.decode("utf-8"))
                    if isinstance(data, dict):
                        err = data.get("error") or data.get("message") or data.get("detail") or ""
                except Exception:
                    pass
                detail = (detail + " / " if detail else "") + f"ไม่สำเร็จ ({response.status_code}){': ' + str(err)[:300] if err else ''}"
            write(
                user=user, username=username, method=method, path=path, status=response.status_code,
                action=action, detail=detail, payload=payload_text, ip=client_ip(request),
                duration_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception:
            traceback.print_exc()
        return response


def is_admin(user):
    return str(getattr(user, "role", "") or "").lower() in ADMIN_ROLES
