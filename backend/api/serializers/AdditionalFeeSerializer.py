from rest_framework import serializers
from api.models import AdditionalFee

class AdditionalFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalFee
        fields = ['id', 'description', 'amount']