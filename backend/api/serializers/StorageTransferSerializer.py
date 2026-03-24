from rest_framework import serializers
from api.models import StorageTransfer
from .StorageSerializer import StorageSerializer
from .BikeSerializer import BikeSerializer

class StorageTransferSerializer(serializers.ModelSerializer):
    bikes = BikeSerializer(many=True)
    origin = StorageSerializer(many=False)
    destination = StorageSerializer(many=False)

    class Meta:
        model = StorageTransfer
        fields = ['id', 'transfer_date', 'bikes', 'origin', 'destination']