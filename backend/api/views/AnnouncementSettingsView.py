# AnnouncementSettingsView.py
# วางไฟล์นี้ใน: backend/api/views/AnnouncementSettingsView.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.models.AnnouncementSettings import AnnouncementSettings
from api.serializers.AnnouncementSettingsSerializer import AnnouncementSettingsSerializer


class AnnouncementSettingsView(APIView):
    """
    GET   /announcements/settings/   ทุกคนที่ login แล้วดูได้ (ใช้กำหนดความเร็ว animation ของแถบไหล)
    PATCH /announcements/settings/   แก้ความเร็วได้เฉพาะ admin - body: { speed_seconds }
    """

    def get(self, request):
        obj, _ = AnnouncementSettings.objects.get_or_create(pk=1)
        return Response(AnnouncementSettingsSerializer(obj).data)

    def patch(self, request):
        if getattr(request.user, "role", None) != "adm":
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้"}, status=status.HTTP_403_FORBIDDEN)

        obj, _ = AnnouncementSettings.objects.get_or_create(pk=1)
        try:
            speed = int(request.data.get("speed_seconds"))
        except (TypeError, ValueError):
            return Response({"error": "ค่าความเร็วไม่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ กันตั้งเร็วเกินจนอ่านไม่ทัน - อย่างน้อย 5 วินาทีต่อรอบ
        obj.speed_seconds = max(speed, 5)
        obj.save()
        return Response(AnnouncementSettingsSerializer(obj).data)