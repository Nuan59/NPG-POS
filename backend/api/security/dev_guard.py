"""
✅ กันหน้าเครื่องมือนักพัฒนา /dev/... (สร้างตาราง / migrate / ลบข้อมูลซ้ำ ฯลฯ) ไม่ให้คนนอกเรียกได้

เปิดใช้ได้ 2 ทาง (อย่างใดอย่างหนึ่ง):
  1. ล็อกอินเป็น adm แล้วเรียกพร้อม header  Authorization: Bearer <token>
  2. ตั้ง env DEV_TOOLS_KEY ใน Railway แล้วเปิดในเบราว์เซอร์แบบ  /dev/xxx/?key=<DEV_TOOLS_KEY>
ไม่ผ่านทั้งสองทาง → ตอบ 404 เหมือนไม่มีหน้านี้ (ไม่บอกคนนอกว่ามีอยู่)
"""
import functools
import hmac
import os

from django.http import JsonResponse

ADMIN_ROLES = {"adm", "admin", "administrator"}


def _is_admin_token(request):
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        result = JWTAuthentication().authenticate(request)
    except Exception:
        return False
    if not result:
        return False
    user = result[0]
    return str(getattr(user, "role", "") or "").lower() in ADMIN_ROLES


def dev_allowed(request):
    key = os.environ.get("DEV_TOOLS_KEY", "")
    given = request.GET.get("key", "")
    if key and given and hmac.compare_digest(key, given):
        return True
    return _is_admin_token(request)


def guard(view):
    @functools.wraps(view)
    def wrapped(request, *args, **kwargs):
        if not dev_allowed(request):
            return JsonResponse({"detail": "Not found."}, status=404)
        return view(request, *args, **kwargs)
    return wrapped


def guard_dev_urls(urlpatterns, prefix="dev/"):
    """ห่อทุก path ที่ขึ้นต้นด้วย dev/ ด้วย guard (path ใหม่ที่เพิ่มทีหลังก็โดนกันอัตโนมัติ)"""
    for p in urlpatterns:
        if str(getattr(p, "pattern", "")).startswith(prefix) and hasattr(p, "callback"):
            p.callback = guard(p.callback)
    return urlpatterns
