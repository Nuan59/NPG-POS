from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from api.serializers import CustomerMapSerializer
from api.models import Customer

class CustomerMapView(generics.ListAPIView):
    """API สำหรับดึงข้อมูลลูกค้าทั้งหมด พร้อมพิกัดแผนที่และรุ่นรถที่ซื้อ"""
    serializer_class = CustomerMapSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Customer.objects.all().order_by('-id')