from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from api.serializers import CustomerSerializer
from api.models import Customer, Order
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'list':
            return [AllowAny()]
        return super().get_permissions()

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

        # แปลงเพศ
        gender_map = {
            'ชาย': 'M', 'M': 'M', 'male': 'M',
            'หญิง': 'F', 'F': 'F', 'female': 'F',
        }

        for i, customer in enumerate(customers_data):
            gender_raw = customer.get('gender', '')
            gender = gender_map.get(gender_raw, 'M')

            # แปลงวันเกิด dd/mm/yy หรือ dd/mm/yyyy
            birth_date = customer.get('birth_date', '') or None
            if birth_date:
                try:
                    parts = birth_date.split('/')
                    if len(parts) == 3:
                        d, m, y = parts
                        if len(y) == 2:
                            y = '25' + y  # พ.ศ. 2 หลัก → 4 หลัก
                        # แปลง พ.ศ. → ค.ศ.
                        year_int = int(y)
                        if year_int > 2500:
                            year_int -= 543
                        birth_date = f"{year_int}-{m.zfill(2)}-{d.zfill(2)}"
                except:
                    birth_date = None

            data = {
                'name': customer.get('first_name', ''),
                'phone': customer.get('phone', ''),
                'gender': gender,
                'dob': birth_date,
                'age': customer.get('age', 0) or 0,
                'id_card_number': customer.get('citizen_id', '') or '',
                'address': customer.get('address', ''),
                'subdistrict': customer.get('subdistrict', ''),
                'district': customer.get('district', ''),
                'province': customer.get('province', ''),
            }

            serializer = CustomerSerializer(data=data)
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
        return Response({'count': len(upcoming), 'results': upcoming})

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
        
        return Response({'count': len(today_birthdays), 'results': today_birthdays})