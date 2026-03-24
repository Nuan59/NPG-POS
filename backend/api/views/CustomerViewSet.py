from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from api.serializers import CustomerSerializer
from api.models import Customer, Order
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Max

class CustomerViewSet(viewsets.ModelViewSet):
    """Listing all registered customers"""
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        อนุญาตให้เข้าถึง GET /customers/ โดยไม่ต้อง login
        สำหรับ Birthday Notification
        """
        if self.action == 'list':
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='birthdays/upcoming')
    def upcoming_birthdays(self, request):
        """
        ดึงลูกค้าที่จะมีวันเกิดใน 7 วันข้างหน้า (รวมวันนี้)
        พร้อมข้อมูลการซื้อ
        """
        today = timezone.now().date()
        
        # คำนวณวันที่ 7 วันข้างหน้า
        end_date = today + timedelta(days=7)
        
        upcoming = []
        
        # วนหาลูกค้าทั้งหมดที่มีวันเกิด
        for customer in Customer.objects.filter(dob__isnull=False):
            # สร้างวันเกิดในปีนี้
            try:
                birthday_this_year = customer.dob.replace(year=today.year)
            except ValueError:
                # กรณี 29 กุมภาพันธ์ในปีที่ไม่ใช่ leap year
                continue
            
            # ถ้าวันเกิดปีนี้ผ่านไปแล้ว ให้ดูปีหน้า
            if birthday_this_year < today:
                try:
                    birthday_this_year = customer.dob.replace(year=today.year + 1)
                except ValueError:
                    continue
            
            # เช็คว่าอยู่ในช่วง 7 วันหรือไม่
            if today <= birthday_this_year <= end_date:
                # คำนวณจำนวนวันจนถึงวันเกิด
                days_until = (birthday_this_year - today).days
                
                # ดึงข้อมูลการซื้อ
                orders = Order.objects.filter(customer=customer)
                total_orders = orders.count()
                latest_order = orders.order_by('-sale_date').first()
                
                customer_data = CustomerSerializer(customer).data
                customer_data['days_until_birthday'] = days_until
                customer_data['is_today'] = days_until == 0
                customer_data['total_orders'] = total_orders
                customer_data['latest_order'] = {
                    'id': latest_order.id if latest_order else None,
                    'date': latest_order.sale_date if latest_order else None,
                    'total': float(latest_order.total) if latest_order else 0,
                } if latest_order else None
                
                upcoming.append(customer_data)
        
        # เรียงตามจำนวนวันจนถึงวันเกิด (วันเกิดวันนี้ขึ้นก่อน)
        upcoming.sort(key=lambda x: x['days_until_birthday'])
        
        return Response({
            'count': len(upcoming),
            'results': upcoming
        })

    @action(detail=False, methods=['get'], url_path='birthdays/today')
    def birthdays_today(self, request):
        """
        ดึงลูกค้าที่วันเกิดวันนี้
        """
        today = timezone.now().date()
        
        today_birthdays = []
        
        for customer in Customer.objects.filter(dob__isnull=False):
            if customer.dob.day == today.day and customer.dob.month == today.month:
                # ดึงข้อมูลการซื้อ
                orders = Order.objects.filter(customer=customer)
                total_orders = orders.count()
                latest_order = orders.order_by('-sale_date').first()
                
                customer_data = CustomerSerializer(customer).data
                customer_data['total_orders'] = total_orders
                customer_data['latest_order'] = {
                    'id': latest_order.id if latest_order else None,
                    'date': latest_order.sale_date if latest_order else None,
                    'total': float(latest_order.total) if latest_order else 0,
                } if latest_order else None
                
                today_birthdays.append(customer_data)
        
        return Response({
            'count': len(today_birthdays),
            'results': today_birthdays
        })