from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import pytz
from api.models import User
from api.models.WorkHours import WorkHours, LoginLog


def _log_login(user):
    """บันทึกเวลาเข้าระบบ - พังก็ไม่ให้ล็อกอินพัง (เช่น ยังไม่ได้สร้างตาราง login_log)"""
    try:
        LoginLog.objects.create(user=user)
    except Exception:
        pass


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return super().post(request, *args, **kwargs)

        # ✅ adm และผู้ตรวจสอบ (mon) เข้าระบบได้ตลอด ไม่ติดเวลาทำงาน
        if user.role not in ("adm", "mon"):
            work = WorkHours.get_settings()

            if work.is_enabled:
                tz = pytz.timezone("Asia/Bangkok")
                now = timezone.now().astimezone(tz)
                current_minutes = now.hour * 60 + now.minute
                start_minutes = work.start_hour * 60 + work.start_minute
                end_minutes = work.end_hour * 60 + work.end_minute

                if not (start_minutes <= current_minutes <= end_minutes):
                    # ส่ง error code พิเศษ outside_working_hours
                    return Response(
                        {"detail": "outside_working_hours",
                         "start": f"{work.start_hour:02d}:{work.start_minute:02d}",
                         "end": f"{work.end_hour:02d}:{work.end_minute:02d}"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )

        response = super().post(request, *args, **kwargs)
        # ✅ ล็อกอินสำเร็จจริง (รหัสผ่านถูก) ค่อยบันทึก - token refresh ไม่ผ่านตรงนี้ จึงไม่นับซ้ำ
        if response.status_code == 200:
            _log_login(user)
        return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /auth/logout/ - frontend เรียกตอนกดปุ่มออกระบบ ปิดรอบล่าสุดที่ยังไม่ได้ออก
    (ไม่ได้ยกเลิก token - JWT หมดอายุเอง ตรงนี้แค่บันทึกเวลาออกไว้ทำรายงาน)
    """
    try:
        log = LoginLog.objects.filter(user=request.user, logout_at__isnull=True).order_by("-login_at").first()
        if log:
            log.logout_at = timezone.now()
            log.save(update_fields=["logout_at"])
    except Exception:
        pass
    return Response({"ok": True})