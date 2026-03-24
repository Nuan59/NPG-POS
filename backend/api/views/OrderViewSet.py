from rest_framework import viewsets
from rest_framework.decorators import action
from api.serializers import OrderSerializer, CustomerSerializer
from api.models import Order, Customer, Bike, AdditionalFee, Gift, OrderGift, NPGAccount
from api.util import convert_number
from django.utils.timezone import datetime
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from datetime import datetime, timedelta, date
from rest_framework.permissions import AllowAny

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet สำหรับจัดการ Order (คำสั่งซื้อ)
    
    ฟิลด์การชำระเงิน:
    - payment_method: ประเภทการซื้อ (เดิม: การชำระเงิน)
    - payment_type: รูปแบบการชำระ (เดิม: ชำระด้วย)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """ดึงรายการ Order พร้อม filter"""
        queryset = Order.objects.all().order_by('-id')
        
        customer = self.request.query_params.get('customer')
        startDate = self.request.query_params.get('startDate')
        endDate = self.request.query_params.get('endDate')
        bike = self.request.query_params.get('bike')
        
        if customer is not None:
            filtercustomer = get_object_or_404(Customer, pk=customer)
            queryset = queryset.filter(customer=filtercustomer)
        if startDate is not None and endDate is not None:
            queryset = queryset.filter(sale_date__range=[startDate, endDate])
        if bike is not None:
            queryset = queryset.filter(bikes__id=bike)
            
        return queryset
    

    def create(self, request):
        """
        สร้าง Order ใหม่
        
        ฟิลด์ที่รับจาก Frontend:
        - customer: ID ของลูกค้า
        - bikes: รายการรถที่ซื้อ
        - additional_fees: ค่าใช้จ่ายเพิ่มเติม
        - gifts: ของแถม
        - sale_price: ราคาสินค้า
        - deposit: มัดจำ
        - down_payment: เงินดาวน์
        - discount: ส่วนลด
        - finance_amount: ยอดจัด
        - interest_rate: ดอกเบี้ย
        - installment_count: จำนวนงวด
        - installment_amount: ค่างวด
        - finance_provider: บริษัทไฟแนนซ์
        - payment_method: ประเภทการซื้อ (UI: "ประเภทการซื้อ")
        - payment_type: รูปแบบการชำระ (UI: "รูปแบบการชำระ")
        - transfer_bank: ธนาคารโอน
        - check_number: เลขที่เช็ค
        - notes: หมายเหตุ
        """
        try:
            customer = Customer.objects.filter(pk=request.data["customer"])[0]

            # รับข้อมูลจาก Frontend
            additional_fees_total = sum([float(fee.get('amount', 0)) for fee in request.data.get('additional_fees', [])])
            down_payment = float(request.data.get('down_payment', 0))
            discount = float(request.data.get('discount', 0))
            deposit = float(request.data.get('deposit', 0))
            sale_price = float(request.data.get('sale_price', 0))
            
            # คำนวณยอดรวม
            calculated_total = additional_fees_total + down_payment - discount - deposit

            # ข้อมูลไฟแนนซ์
            finance_amount = float(request.data.get('finance_amount', 0))
            interest_rate = float(request.data.get('interest_rate', 0))
            installment_count = int(request.data.get('installment_count', 0))
            installment_amount = float(request.data.get('installment_amount', 0))
            finance_provider = request.data.get('finance_provider', '')

            # วิธีการชำระเงิน
            payment_method = request.data.get('payment_method', '')  # ประเภทการซื้อ
            payment_type = request.data.get('payment_type', '')  # รูปแบบการชำระ
            transfer_bank = request.data.get('transfer_bank', '')
            check_number = request.data.get('check_number', '')

            # สร้าง Order
            with transaction.atomic():
                new_order = Order.objects.create(
                    sale_date=datetime.today(),
                    customer=customer,
                    seller=request.user,

                    total_price=calculated_total,
                    sale_price=sale_price,
                    deposit=deposit,
                    discount=discount,
                    down_payment=down_payment,
                    total=calculated_total,

                    # ข้อมูลไฟแนนซ์
                    finance_amount=finance_amount,
                    interest_rate=interest_rate,
                    installment_count=installment_count,
                    installment_amount=installment_amount,
                    finance_provider=finance_provider,

                    # วิธีการชำระเงิน
                    payment_method=payment_method,  # ประเภทการซื้อ
                    payment_type=payment_type,  # รูปแบบการชำระ
                    transfer_bank=transfer_bank,
                    check_number=check_number,
                    
                    notes=request.data.get('notes', ''),
                    registration_status='CPL',
                    has_checkout=True
                )

                # เพิ่มรถ
                for bike in request.data['bikes']:
                    instance = Bike.objects.filter(pk=bike['id'])[0]
                    instance.sold = True
                    instance.save()
                    new_order.bikes.add(instance)

                # เพิ่มค่าใช้จ่ายเพิ่มเติม
                for fee in request.data['additional_fees']:
                    instance = AdditionalFee.objects.create(
                        description=fee["description"],
                        amount=fee['amount']
                    )
                    new_order.additional_fees.add(instance)
                    instance.save()

                # เพิ่มของแถม
                for gift in request.data['gifts']:
                    gift_instance = Gift.objects.filter(pk=gift['id'])[0]
                    gift_instance.stock -= gift['amount']
                    gift_instance.save()

                    order_gift = OrderGift.objects.create(
                        item=gift_instance,
                        quantity=gift["amount"]
                    )
                    new_order.gifts.add(order_gift)
                    order_gift.save()

                new_order.save()

                # สร้าง NPG Account ถ้าเป็นไฟแนนซ์ NPG
                if finance_provider == 'NPG' and finance_amount > 0:
                    try:
                        total_with_interest = finance_amount + (
                            finance_amount * (interest_rate / 100) * installment_count
                        )
                        
                        NPGAccount.objects.create(
                            order=new_order,
                            status='active',
                            finance_amount=finance_amount,
                            interest_rate=interest_rate,
                            installment_count=installment_count,
                            installment_amount=installment_amount,
                            period_type='รายเดือน',
                            paid_count=0,
                            total_paid=0,
                            remaining_balance=total_with_interest,
                            start_date=datetime.today().date(),
                            next_payment_date=datetime.today().date() + timedelta(days=30),
                        )
                        print(f"✅ สร้าง NPG Account สำหรับ Order #{new_order.id}")
                    except Exception as e:
                        print(f"❌ ไม่สามารถสร้าง NPG Account: {str(e)}")

            return Response({"success": True, "data": new_order.id})
        
        except Exception as e:
            print(f"❌ Error in create: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'ไม่สามารถสร้างรายการขายได้: {str(e)}'
            }, status=500)


    def update(self, request, *args, **kwargs):
        """
        แก้ไข Order
        
        ฟิลด์ที่แก้ไขได้:
        - notes: หมายเหตุ
        - paymentMethod: ประเภทการซื้อ
        - discount: ส่วนลด
        - downPayment: เงินดาวน์
        - bikePrice: ราคารถ
        - additionalFees: ค่าใช้จ่ายเพิ่มเติม
        """
        try:
            order_to_edit = Order.objects.get(pk=kwargs['pk'])

            new_total = 0
            
            # แก้ไขฟิลด์เดี่ยว
            order_to_edit.notes = request.data.get('notes', '')
            order_to_edit.payment_method = request.data.get('paymentMethod', '')  # ประเภทการซื้อ
            order_to_edit.discount = request.data.get('discount', 0)
            order_to_edit.down_payment = request.data.get('downPayment', 0)

            # แก้ไขราคารถ
            bike_to_edit = order_to_edit.bikes.all()[0]
            bike_to_edit.sale_price = request.data.get('bikePrice', bike_to_edit.sale_price)
            bike_to_edit.save()

            # แก้ไขค่าใช้จ่ายเพิ่มเติม
            for old_fee in order_to_edit.additional_fees.all():
                order_to_edit.additional_fees.remove(old_fee)
                old_fee.delete()

            for new_fee in request.data.get('additionalFees', []):
                create_fee = AdditionalFee.objects.create(
                    description=new_fee['description'],
                    amount=new_fee['amount']
                )
                order_to_edit.additional_fees.add(create_fee)
                new_total += float(create_fee.amount)
                create_fee.save()

            # สูตร: ค่าใช้จ่าย + เงินดาวน์ - ส่วนลด
            new_total = new_total + float(order_to_edit.down_payment) - float(order_to_edit.discount)

            order_to_edit.total = new_total
            order_to_edit.total_price = new_total
            order_to_edit.save()
            
            return Response({'message': 'order edited!'}, status=200)
        
        except Order.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'ไม่พบรายการขายที่ต้องการแก้ไข'
            }, status=404)
        except Exception as e:
            print(f"❌ Error in update: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'ไม่สามารถแก้ไขรายการขายได้: {str(e)}'
            }, status=500)


    def destroy(self, request, *args, **kwargs):
        """
        ลบ Order พร้อม 2 โหมด:
        - restore_stock=true: ยกเลิกการขาย (คืนสินค้าเข้าสต็อก)
        - restore_stock=false: ลบรายการขาย (ไม่คืนสินค้า)
        
        Parameters:
            restore_stock (query param): 'true' หรือ 'false' (default: 'false')
        """
        try:
            order_to_delete = Order.objects.get(pk=kwargs['pk'])
        except Order.DoesNotExist:
            return Response({
                'status': 'error', 
                'message': 'ไม่พบรายการขายที่ต้องการลบ'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error', 
                'message': f'เกิดข้อผิดพลาด: {str(e)}'
            }, status=400)

        # อ่าน parameter restore_stock (default = false)
        restore_stock_param = request.query_params.get('restore_stock', 'false')
        restore_stock = restore_stock_param.lower() == 'true'

        try:
            with transaction.atomic():
                # จัดการกับสินค้าตาม mode
                bikes_count = 0
                if restore_stock:
                    # โหมด: ยกเลิกการขาย (คืนสินค้าเข้าสต็อก)
                    for bike in order_to_delete.bikes.all():
                        bike.sold = False
                        bike.save()
                        bikes_count += 1
                    print(f"✅ คืนสินค้า {bikes_count} คันกลับเข้าสต็อก")
                else:
                    # โหมด: ลบรายการขาย (ไม่คืนสินค้า)
                    bikes_count = order_to_delete.bikes.count()
                    print(f"⚠️ ลบรายการโดยไม่คืนสินค้า ({bikes_count} คันยังคง sold=True)")

                # ลบค่าใช้จ่ายเพิ่มเติม
                for fee in order_to_delete.additional_fees.all():
                    fee.delete()
                
                # ลบของแถม (ไม่คืนสต็อก)
                for gift in order_to_delete.gifts.all():
                    gift.delete()
                
                # เก็บข้อมูลก่อนลบ
                order_id = order_to_delete.id
                customer_name = order_to_delete.customer.name if order_to_delete.customer else "ไม่ระบุ"
                
                # ลบออเดอร์
                order_to_delete.delete()
                
                # Response
                action_text = "ยกเลิกการขายและคืนสินค้า" if restore_stock else "ลบรายการขาย"
                stock_info = f"คืนสินค้า {bikes_count} คันเข้าสต็อก" if restore_stock else f"ไม่คืนสินค้า ({bikes_count} คัน)"
                
                return Response({
                    'status': 'success', 
                    'message': f'{action_text}สำเร็จ',
                    'details': {
                        'order_id': order_id,
                        'customer': customer_name,
                        'restored_stock': restore_stock,
                        'bikes_count': bikes_count,
                        'stock_info': stock_info
                    }
                }, status=200)
                
        except Exception as e:
            print(f"❌ Error in destroy: {str(e)}")
            return Response({
                'status': 'error', 
                'message': f'ไม่สามารถลบรายการขายได้: {str(e)}'
            }, status=500)


    @action(methods=['GET'], detail=False)
    def latest(self, request):
        """Return 4 last sales"""
        queryset = self.get_queryset()[:4]
        serializer = OrderSerializer(queryset, many=True)
        return Response(serializer.data)


    # ✅ เพิ่ม endpoint ดึง Order ที่ทะเบียนกำลังหมดอายุ
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def registration_expiring(self, request):
        """
        ดึง Order ที่ทะเบียนกำลังหมดอายุ
        - ภายใน 3 เดือน (90 วัน) = warning
        - ภายใน 1 เดือน (30 วัน) = critical
        """
        today = date.today()
        
        # Order ที่มีวันหมดอายุทะเบียน และยังไม่หมดอายุ
        orders = Order.objects.filter(
            registration_expiry_date__isnull=False,
            registration_expiry_date__gte=today
        ).select_related('customer').prefetch_related('bikes')
        
        expiring_soon = []
        
        for order in orders:
            days_until_expiry = (order.registration_expiry_date - today).days
            
            # กรองเฉพาะที่อยู่ใน 90 วัน
            if 0 <= days_until_expiry <= 90:
                # ข้อมูลรถ
                bike = order.bikes.first() if order.bikes.exists() else None
                
                order_data = {
                    'id': order.id,
                    'customer': {
                        'id': order.customer.id if order.customer else None,
                        'name': order.customer.name if order.customer else None,
                        'phone': order.customer.phone if order.customer else None,
                    } if order.customer else None,
                    'bike': {
                        'id': bike.id,
                        'model_name': bike.model_name,
                        'model_code': bike.model_code,
                        'registration_plate': bike.registration_plate,
                    } if bike else None,
                    'registration_expiry_date': order.registration_expiry_date.isoformat(),
                    'days_until_expiry': days_until_expiry,
                    'urgency': 'critical' if days_until_expiry <= 30 else 'warning',
                }
                expiring_soon.append(order_data)
        
        # เรียงตามความเร่งด่วน (น้อยไปมาก)
        expiring_soon.sort(key=lambda x: x['days_until_expiry'])
        
        return Response(expiring_soon)

    @action(methods=['GET'], detail=True)
    def receipt(self, request, *args, **kwargs):
        """Returns sale receipt data"""
        order = self.get_object()
        customer = order.customer

        serialized_order = OrderSerializer(order, many=False)
        serialized_customer = CustomerSerializer(customer, many=False)
        value_text = convert_number(order.total)

        return Response({
            'customer': serialized_customer.data, 
            'order': serialized_order.data, 
            'amount_text': value_text
        })