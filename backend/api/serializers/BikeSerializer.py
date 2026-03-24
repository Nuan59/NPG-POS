from rest_framework import serializers
from api.models import Bike

class BikeSerializer(serializers.ModelSerializer):
    storage_place_name = serializers.CharField(source='storage_place.storage_name', read_only=True)
    
    class Meta:
        model = Bike
        fields = '__all__'