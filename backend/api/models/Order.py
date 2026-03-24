from django.db import models
from .Customer import Customer
from .Bike import Bike
from .AdditionalFee import AdditionalFee
from .User import User
from .OrderGift import OrderGift

class Order(models.Model):
    """
    Model สำหรับเก็บข้อมูลการขาย
    
    ฟิลด์หลัก:
    - sale_date: วันที่ขาย
    - seller: พนักงานขาย
    - customer: ลูกค้า
    - bikes: รถที่ขาย (ManyToMany)
    
    ข้อมูลการเงิน:
    - sale_price: ราคาสินค้า (จาก "ขาย")
    - deposit: มัดจำ
    - down_payment: เงินดาวน์
    - discount: ส่วนลด
    - total_price: ยอดรวม
    - total: ยอดสุทธิ
    
    ข้อมูลไฟแนนซ์:
    - finance_amount: ยอดจัด
    - interest_rate: ดอกเบี้ย (%)
    - installment_count: จำนวนงวด
    - installment_amount: ค่างวด
    - finance_provider: บริษัทไฟแนนซ์
    - commission: คอมมิชชั่น
    
    วิธีการชำระเงิน:
    - payment_method: ประเภทการซื้อ (เดิม: การชำระเงิน) - เช่น "เงินสด", "ผ่อนชำระ"
    - payment_type: รูปแบบการชำระ (เดิม: ชำระด้วย) - เช่น "เงินสด", "โอน", "เช็ค", "สินเชื่อ FN"
    - transfer_bank: ธนาคารที่โอน (เช่น "KBank", "BBL")
    - check_number: เลขที่เช็ค
    
    สถานะและอื่นๆ:
    - registration_status: สถานะการทะเบียน (CPL/IPL)
    - doc_status: สถานะเอกสารทะเบียน (pending/received/fixing/completed)
    - has_checkout: ชำระเงินแล้วหรือไม่
    - notes: หมายเหตุ
    - created_at: วันที่สร้าง Order (สำหรับนับ 45 วัน)
    """
    
    STATUS = [
        ('CPL', 'Complete'),
        ('IPL', 'Incomplete'),
    ]
    
    REGISTRATION_DOC_STATUS = [
        ('pending',   'รอเอกสาร'),
        ('received',  'รับเอกสารแล้ว'),
        ('fixing',    'แก้เอกสาร'),
        ('completed', 'ลูกค้ารับเล่มแล้ว'),
    ]
    
    # ข้อมูลหลัก
    sale_date = models.DateField(auto_now_add=False)
    seller = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True)
    bikes = models.ManyToManyField(Bike)
    
    # ข้อมูลการเงิน
    total_price = models.FloatField(default=0)
    discount = models.IntegerField(default=0)
    down_payment = models.FloatField(default=0, null=True)
    additional_fees = models.ManyToManyField(AdditionalFee, blank=True)
    
    sale_price = models.FloatField(default=0, null=True, blank=True)  # ราคาสินค้า (จาก "ขาย")
    deposit = models.FloatField(default=0, null=True, blank=True)  # มัดจำ
    
    # ข้อมูลไฟแนนซ์
    finance_amount = models.FloatField(default=0, null=True, blank=True)  # ยอดจัด
    interest_rate = models.FloatField(default=0, null=True, blank=True)  # ดอกเบี้ย
    installment_count = models.IntegerField(default=0, null=True, blank=True)  # จำนวนงวด
    installment_amount = models.FloatField(default=0, null=True, blank=True)  # ค่างวด
    finance_provider = models.CharField(max_length=50, null=True, blank=True)  # บริษัทไฟแนนซ์
    commission = models.FloatField(default=0, null=True, blank=True)
    
    total = models.FloatField(default=0, null=True)
    
    # วิธีการชำระเงิน
    payment_method = models.CharField(max_length=50)  # ประเภทการซื้อ (เดิม: การชำระเงิน)
    payment_type = models.CharField(max_length=50, null=True, blank=True)  # รูปแบบการชำระ (เดิม: ชำระด้วย)
    transfer_bank = models.CharField(max_length=50, null=True, blank=True)  # ธนาคารโอน (KBank, BBL)
    check_number = models.CharField(max_length=100, null=True, blank=True)  # เลขที่เช็ค
    
    # สถานะและอื่นๆ
    notes = models.TextField(null=True, blank=True)
    registration_status = models.CharField(max_length=3, choices=STATUS)
    has_checkout = models.BooleanField(default=False)
    
    gifts = models.ManyToManyField(OrderGift, blank=True)
    
    doc_status = models.CharField(
        max_length=20,
        choices=REGISTRATION_DOC_STATUS,
        default='pending',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    
    # ✅ วันหมดอายุทะเบียน
    registration_expiry_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name='วันหมดอายุทะเบียน',
        help_text='วันที่ทะเบียนรถหมดอายุ (สำหรับแจ้งเตือน)'
    )
    
    def __str__(self):
        return f"Order #{self.id} - {self.customer.name if self.customer else 'No Customer'}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'