# AnnouncementSettingsSerializer.py
# วางไฟล์นี้ใน: backend/api/serializers/AnnouncementSettingsSerializer.py
from rest_framework import serializers
from api.models.AnnouncementSettings import AnnouncementSettings


class AnnouncementSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnouncementSettings
        fields = ["speed_seconds"]