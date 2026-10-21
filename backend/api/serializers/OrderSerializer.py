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

    # ✅ รายเดือน/รายปี ของบัญชี NPG (ถ้ามี) — ดึงจาก NPGAccount ที่ผูกกับ order นี้
    # ✅ รายเดือน/รายปี ของบัญชี NPG - อ่านจาก field ของ Order เอง (ค่าจริงที่บันทึกตอนสร้าง/แก้ไข)
    # fallback ไปที่ NPGAccount.period_type เฉพาะออเดอร์เก่าที่ยังไม่มีค่าใน Order.npg_period
    def get_npg_period(self, obj):
        if obj.npg_period:
            return obj.npg_period
        npg_account = getattr(obj, 'npg_account', None)
        return npg_account.period_type if npg_account else None

    npg_period = serializers.SerializerMethodField()

    # ✅ เช็คลิสต์หลังขายยังขาดกี่ข้อ (ใช้ติดป้ายในหน้ารายการขาย)
    #    None = ไม่มีเช็คลิสต์ (ออเดอร์เก่าก่อนมีระบบ) / 0 = ครบ / > 0 = ขาดกี่ข้อ
    #    โหลดทีเดียวทั้งตาราง แล้วเก็บไว้ใน context - ไม่ยิง query ทีละออเดอร์
    checklist_missing = serializers.SerializerMethodField()

    def _checklist_counts(self):
        cache = self.context.get('_checklist_counts')
        if cache is None:
            cache = {}
            try:
                from django.db import connection
                from api.views.OrderViewSet import CHECKLIST_KEYS
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT order_id, COUNT(*) FILTER (WHERE item_key = ANY(%s)) FROM sale_checklist GROUP BY order_id",
                        [list(CHECKLIST_KEYS)],
                    )
                    cache = {row[0]: row[1] for row in cursor.fetchall()}
            except Exception:
                cache = {}  # ยังไม่ได้สร้างตาราง sale_checklist
            self.context['_checklist_counts'] = cache
        return cache

    def get_checklist_missing(self, obj):
        try:
            from api.views.OrderViewSet import CHECKLIST_KEYS
        except Exception:
            return None
        counts = self._checklist_counts()
        # ออเดอร์เก่า (จบแล้ว และไม่เคยมีเช็คลิสต์) ไม่ต้องติดป้าย
        if obj.id not in counts and getattr(obj, 'sale_status', 'completed') == 'completed':
            return None
        return max(len(CHECKLIST_KEYS) - counts.get(obj.id, 0), 0)

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
            'npg_period',           # ✅ รายเดือน/รายปี (เฉพาะบัญชี NPG)
            'commission',           # คอมมิชชั่น
            
            # วิธีการชำระเงิน
            'payment_method',       # ประเภทการซื้อ (เดิม: การชำระเงิน)
            'payment_type',         # รูปแบบการชำระ (เดิม: ชำระด้วย)
            'transfer_bank',        # ธนาคารโอน
            'check_number',         # เลขที่เช็ค
            'cash_amount',          # ✅ ยอดเงินสด (กรณีแบ่งจ่าย)
            
            # สถานะและอื่นๆ
            'registration_status',
            'has_checkout',
            'notes',
            'registration_expiry_date',  # ✅ วันหมดอายุทะเบียน
            'transaction_type',          # ✅ ประเภทธุรกรรม (ขาย/ซ่อม/ต่อภาษี+พรบ/อื่นๆ)
            'transaction_type_detail',   # ✅ รายละเอียดประเภทงาน (กรณี "อื่นๆ")
            'mileage',                   # ✅ เลขไมล์ตอนรับบริการ
            'sale_status',               # ✅ pending = รอจบรายการ / completed = ตัดขายแล้ว
            'checklist_missing',         # ✅ เช็คลิสต์ยังขาดกี่ข้อ (None = ไม่มีเช็คลิสต์)
        ]