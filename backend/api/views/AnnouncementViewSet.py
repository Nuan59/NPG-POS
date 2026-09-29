# AnnouncementViewSet.py
# วางไฟล์นี้ใน: backend/api/views/AnnouncementViewSet.py
from rest_framework import viewsets, status
from rest_framework.response import Response

from api.models.Announcement import Announcement
from api.serializers.AnnouncementSerializer import AnnouncementSerializer


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    GET    /announcements/            ทุกคนที่ login แล้วดูได้ (เรียงใหม่สุดก่อน)
    POST   /announcements/            สร้างประกาศใหม่ (เฉพาะ admin)
    PATCH  /announcements/{id}/       แก้ไข/เปิดปิด (เฉพาะ admin) เช่น { is_active: false }
    DELETE /announcements/{id}/       ลบ (เฉพาะ admin)
    """
    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()

    def _is_admin(self, request):
        return getattr(request.user, "role", None) == "adm"

    def _display_name(self, request):
        return getattr(request.user, "name", None) or getattr(request.user, "username", "") or ""

    def create(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่ประกาศได้"}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "กรุณากรอกข้อความประกาศ"}, status=status.HTTP_400_BAD_REQUEST)

        announcement = Announcement.objects.create(
            content=content,
            created_by=self._display_name(request),
            created_by_username=getattr(request.user, "username", "") or "",
        )
        return Response(self.get_serializer(announcement).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขได้"}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบได้"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)