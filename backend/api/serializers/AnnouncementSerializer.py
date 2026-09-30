# AnnouncementSerializer.py
# วางไฟล์นี้ใน: backend/api/serializers/AnnouncementSerializer.py
from rest_framework import serializers
from api.models.Announcement import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "content", "detail", "is_active", "created_by", "created_by_username", "created_at"]
        read_only_fields = ["id", "created_by", "created_by_username", "created_at"]