from rest_framework import serializers
from api.models import Customer, Order

class CustomerMapSerializer(serializers.ModelSerializer):
    """Serializer สำหรับแสดงข้อมูลลูกค้าบนแผนที่"""
    bike_models = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'address', 'phone', 'district', 'latitude', 'longitude', 'bike_models']
    
    def get_bike_models(self, obj):
        """ดึงรุ่นรถทั้งหมดที่ลูกค้าซื้อ"""
        try:
            orders = Order.objects.filter(customer=obj).prefetch_related('bikes')
            bike_models = []
            
            for order in orders:
                for bike in order.bikes.all():
                    # ลองหาชื่อรุ่นรถจาก attribute ต่างๆ
                    model_name = None
                    
                    # ลองหา attribute ที่เป็นไปได้
                    if hasattr(bike, 'model_name'):
                        model_name = bike.model_name
                    elif hasattr(bike, 'model'):
                        model_name = bike.model
                    elif hasattr(bike, 'name'):
                        model_name = bike.name
                    elif hasattr(bike, 'bike_model'):
                        model_name = bike.bike_model
                    else:
                        # ถ้าไม่มี ให้ใช้ชื่อ class แทน
                        model_name = str(bike)
                    
                    if model_name and model_name not in bike_models:
                        bike_models.append(model_name)
            
            return bike_models if bike_models else None
        except Exception as e:
            print(f"Error in get_bike_models: {e}")
            return None