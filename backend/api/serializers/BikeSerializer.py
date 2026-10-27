from rest_framework import serializers
from api.models import Bike, BikeSource


def _is_adm(context):
    request = context.get('request') if context else None
    return str(getattr(getattr(request, 'user', None), 'role', '') or '').lower() == 'adm'


class BikeSourceSerializer(serializers.ModelSerializer):
    """ที่มาของรถ - พนักงานเห็นแค่โค้ด / adm เห็นชื่อเต็มด้วย"""
    class Meta:
        model = BikeSource
        fields = ['id', 'code', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not _is_adm(self.context):
            data.pop('name', None)
        return data


class BikeSerializer(serializers.ModelSerializer):
    storage_place_name = serializers.CharField(source='storage_place.storage_name', read_only=True)
    # ✅ ที่มา: โค้ด (ทุกคน) / ชื่อเต็ม (เฉพาะ adm - พนักงานได้ค่าว่าง)
    source_code = serializers.CharField(source='source.code', read_only=True, default=None)
    source_name = serializers.SerializerMethodField()

    def get_source_name(self, obj):
        if obj.source_id and _is_adm(self.context):
            return obj.source.name
        return None

    class Meta:
        model = Bike
        fields = '__all__'