from rest_framework import serializers
from api.models import Order, AdditionalFee
from .AdditionalFeeSerializer import AdditionalFeeSerializer
from .BikeSerializer import BikeSerializer
from .OrderGiftSerializer import OrderGiftSerializer

class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับ Order Model
    
    ฟิลด์ที่ส่งกลับ:
    - ข้อมูลลูกค้า: customer, customer_phone, customer_address, customer_district, 
                    customer_subdistrict, customer_province, customer_postal_code
    - ข้อมูลพนักงาน: salesperson
    - ข้อมูลสินค้า: bikes (nested)
    - ข้อมูลการเงิน: sale_price, deposit, discount, down_payment, total_price, total
    - ข้อมูลไฟแนนซ์: finance_amount, interest_rate, installment_count, 
                      installment_amount, finance_provider, commission
    - วิธีการชำระเงิน: payment_method (ประเภทการซื้อ), payment_type (รูปแบบการชำระ),
                        transfer_bank, check_number
    - สถานะ: registration_status, has_checkout
    - อื่นๆ: additional_fees, gifts, notes
    """
    
    # ข้อมูลลูกค้า
    customer = serializers.ReadOnlyField(source='customer.name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    customer_address = serializers.ReadOnlyField(source='customer.address')
    customer_district = serializers.ReadOnlyField(source='customer.district')
    customer_subdistrict = serializers.ReadOnlyField(source='customer.subdistrict')
    customer_province = serializers.ReadOnlyField(source='customer.province')
    customer_postal_code = serializers.ReadOnlyField(source='customer.postal_code')
    
    # ข้อมูลพนักงาน
    salesperson = serializers.ReadOnlyField(source='seller.name')
    
    # ข้อมูลสินค้าและของแถม (nested)
    bikes = BikeSerializer(many=True, read_only=True)
    additional_fees = AdditionalFeeSerializer(many=True, read_only=True)
    gifts = OrderGiftSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            # ข้อมูลหลัก
            'id',
            'sale_date',
            'seller',
            'customer',
            
            # ข้อมูลลูกค้า
            'customer_phone',
            'customer_address',
            'customer_district',
            'customer_subdistrict',
            'customer_province',
            'customer_postal_code',
            
            # ข้อมูลพนักงาน
            'salesperson',
            
            # ข้อมูลสินค้า
            'bikes',
            'additional_fees',
            'gifts',
            
            # ข้อมูลการเงิน
            'sale_price',           # ราคาสินค้า (จาก "ขาย")
            'deposit',              # มัดจำ
            'discount',             # ส่วนลด
            'down_payment',         # เงินดาวน์
            'total_price',          # ยอดรวม
            'total',                # ยอดสุทธิ
            
            # ข้อมูลไฟแนนซ์
            'finance_amount',       # ยอดจัด
            'interest_rate',        # ดอกเบี้ย
            'installment_count',    # จำนวนงวด
            'installment_amount',   # ค่างวด
            'finance_provider',     # บริษัทไฟแนนซ์
            'commission',           # คอมมิชชั่น
            
            # วิธีการชำระเงิน
            'payment_method',       # ประเภทการซื้อ (เดิม: การชำระเงิน)
            'payment_type',         # รูปแบบการชำระ (เดิม: ชำระด้วย)
            'transfer_bank',        # ธนาคารโอน
            'check_number',         # เลขที่เช็ค
            
            # สถานะและอื่นๆ
            'registration_status',
            'has_checkout',
            'notes',
            'registration_expiry_date',  # ✅ วันหมดอายุทะเบียน
        ]