from rest_framework import serializers
from api.models import Storage

class StorageSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='storage_name', read_only=True)
    
    class Meta:
        model = Storage
        fields = '__all__'