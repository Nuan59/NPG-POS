from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from api.models.WorkHours import WorkHours

class WorkHoursView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        work = WorkHours.get_settings()
        return Response({
            "start_hour": work.start_hour,
            "start_minute": work.start_minute,
            "end_hour": work.end_hour,
            "end_minute": work.end_minute,
            "is_enabled": work.is_enabled,
        })

    def patch(self, request):
        if request.user.role != "adm":
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        work = WorkHours.get_settings()
        for field in ["start_hour", "start_minute", "end_hour", "end_minute"]:
            if field in request.data:
                setattr(work, field, int(request.data[field]))
        if "is_enabled" in request.data:
            work.is_enabled = bool(request.data["is_enabled"])
        work.save()

        return Response({
            "start_hour": work.start_hour,
            "start_minute": work.start_minute,
            "end_hour": work.end_hour,
            "end_minute": work.end_minute,
            "is_enabled": work.is_enabled,
        })