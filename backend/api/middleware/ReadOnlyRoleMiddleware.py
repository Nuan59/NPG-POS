# ReadOnlyRoleMiddleware.py
# วางไฟล์นี้ใน: backend/api/middleware/ReadOnlyRoleMiddleware.py  (สร้างโฟลเดอร์ middleware + ไฟล์ __init__.py ว่างๆ)
# แล้วเพิ่มใน settings.py → MIDDLEWARE: "api.middleware.ReadOnlyRoleMiddleware.ReadOnlyRoleMiddleware"
"""
บัญชี "ผู้ตรวจสอบ" (role = "mon") ดูได้ทุกอย่าง แต่เขียน/แก้/ลบไม่ได้เลย
ยกเว้นปุ่มที่อนุญาตไว้ใน ALLOWED_WRITES เท่านั้น:
  - รับเงิน / ยอดไม่ตรง   POST /cash-handover/<id>/receive/
  - อนุมัติ / ไม่อนุมัติจ่าย  POST /expense-requests/<id>/approve/  และ  /reject/
  - ล็อกอิน / ต่ออายุ token

กันที่ชั้นนี้ชั้นเดียวครอบทุก API (ไม่ต้องไปไล่แก้ทุก ViewSet และ endpoint ใหม่ที่เพิ่มในอนาคตก็ถูกกันอัตโนมัติ)
"""
import re

from django.http import JsonResponse

READ_ONLY_ROLES = {"mon"}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
ALLOWED_WRITES = [
    re.compile(r"^/cash-handover/\d+/receive/?$"),
    re.compile(r"^/expense-requests/\d+/(approve|reject)/?$"),
    re.compile(r"^/(login|auth/token|auth/token/refresh)/?$"),
]


class ReadOnlyRoleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in SAFE_METHODS and not any(p.match(request.path) for p in ALLOWED_WRITES):
            role = self._role(request)
            if role in READ_ONLY_ROLES:
                return JsonResponse(
                    {"error": "บัญชีผู้ตรวจสอบดูได้อย่างเดียว ทำรายการนี้ไม่ได้", "message": "บัญชีผู้ตรวจสอบดูได้อย่างเดียว ทำรายการนี้ไม่ได้"},
                    status=403,
                )
        return self.get_response(request)

    @staticmethod
    def _role(request):
        """อ่าน role จาก JWT (Authorization: Bearer ...) - token ผิด/หมดอายุ ปล่อยให้ DRF ตอบ 401 ตามปกติ"""
        if not request.META.get("HTTP_AUTHORIZATION"):
            return None
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            result = JWTAuthentication().authenticate(request)
        except Exception:
            return None
        if not result:
            return None
        user, _token = result
        return str(getattr(user, "role", "") or "").lower()