from rest_framework import serializers
from api.models import OrderGift

class OrderGiftSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderGift
        fields = ['name', 'quantity']
    
    def get_name(self, obj):
        return obj.item.name if obj.item else None