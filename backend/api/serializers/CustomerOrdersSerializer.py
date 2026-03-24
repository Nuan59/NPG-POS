from rest_framework import serializers
from api.models import Order
from .BikeSerializer import BikeSerializer
from .AdditionalFeeSerializer import AdditionalFeeSerializer

class CustomerOrdersSerializer(serializers.ModelSerializer):
    bikes = BikeSerializer(many=True, read_only=True)
    additional_fees = AdditionalFeeSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'sale_date', 'bikes', 'total_price', 'additional_fees']