from rest_framework import generics
from api.serializers import CustomerMapSerializer
from api.models import Customer
# from rest_framework.permissions import IsAuthenticated  # ✅ comment ไว้

class CustomerMapView(generics.ListAPIView):
    """API สำหรับดึงข้อมูลลูกค้าพร้อมพิกัดแผนที่และรุ่นรถที่ซื้อ"""
    serializer_class = CustomerMapSerializer
    # permission_classes = [IsAuthenticated]  # ✅ comment ไว้ชั่วคราว

    def get_queryset(self):
        queryset = Customer.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False
        ).order_by('-id')
        return queryset