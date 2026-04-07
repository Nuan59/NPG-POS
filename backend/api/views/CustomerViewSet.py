from rest_framework import viewsets, status
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
        if self.action == 'list':
            return [AllowAny()]
        return super().get_permissions()

    # ✅ เพิ่ม action นำเข้าลูกค้าจาก CSV
    @action(detail=False, methods=['post'], url_path='import')
    def import_customers(self, request):
        customers_data = request.data.get('customers', [])
        
        if not customers_data:
            return Response(
                {'error': 'ไม่มีข้อมูลลูกค้า'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created = []
        errors = []

        for i, customer in enumerate(customers_data):
            serializer = CustomerSerializer(data={
                'first_name': customer.get('first_name', ''),
                'phone': customer.get('phone', ''),
                'gender': customer.get('gender', ''),
                'dob': customer.get('birth_date') or None,
                'citizen_id': customer.get('citizen_id', ''),
                'address': customer.get('address', ''),
                'subdistrict': customer.get('subdistrict', ''),
                'district': customer.get('district', ''),
                'province': customer.get('province', ''),
            })

            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({'row': i + 1, 'errors': serializer.errors})

        return Response({
            'created': len(created),
            'errors': errors,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='birthdays/upcoming')
    def upcoming_birthdays(self, request):
        today = timezone.now().date()
        end_date = today + timedelta(days=7)
        upcoming = []
        
        for customer in Customer.objects.filter(dob__isnull=False):
            try:
                birthday_this_year = customer.dob.replace(year=today.year)
            except ValueError:
                continue
            
            if birthday_this_year < today:
                try:
                    birthday_this_year = customer.dob.replace(year=today.year + 1)
                except ValueError:
                    continue
            
            if today <= birthday_this_year <= end_date:
                days_until = (birthday_this_year - today).days
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
        
        upcoming.sort(key=lambda x: x['days_until_birthday'])
        
        return Response({
            'count': len(upcoming),
            'results': upcoming
        })

    @action(detail=False, methods=['get'], url_path='birthdays/today')
    def birthdays_today(self, request):
        today = timezone.now().date()
        today_birthdays = []
        
        for customer in Customer.objects.filter(dob__isnull=False):
            if customer.dob.day == today.day and customer.dob.month == today.month:
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
