from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
import pytz
from api.models import User
from api.models.WorkHours import WorkHours

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return super().post(request, *args, **kwargs)

        if user.role == "adm":
            return super().post(request, *args, **kwargs)

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

        return super().post(request, *args, **kwargs)