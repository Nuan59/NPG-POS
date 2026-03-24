from django.db import models
from django.conf import settings


class Issue(models.Model):
    """
    กระทู้/ปัญหาในระบบ
    """
    STATUS_CHOICES = [
        ('open', 'เปิด'),
        ('in_progress', 'กำลังดำเนินการ'),
        ('resolved', 'แก้ไขแล้ว'),
        ('closed', 'ปิด'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'ต่ำ'),
        ('medium', 'กลาง'),
        ('high', 'สูง'),
        ('urgent', 'เร่งด่วน'),
    ]
    
    CATEGORY_CHOICES = [
        ('customer', 'ลูกค้า'),
        ('inventory', 'สินค้า'),
        ('system', 'ระบบ'),
        ('employee', 'พนักงาน'),
        ('finance', 'การเงิน'),
        ('other', 'อื่นๆ'),
    ]

    # ข้อมูลพื้นฐาน
    title = models.CharField(max_length=200, verbose_name="หัวข้อ")
    description = models.TextField(verbose_name="รายละเอียดปัญหา")
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='other',
        verbose_name="หมวดหมู่"
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name="ระดับความสำคัญ"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='open',
        verbose_name="สถานะ"
    )
    
    # ผู้เกี่ยวข้อง
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_issues',
        verbose_name="ผู้สร้างกระทู้"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_issues',
        verbose_name="มอบหมายให้"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_issues',
        verbose_name="ผู้แก้ไข"
    )
    
    # เวลา
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="วันที่สร้าง")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="อัปเดตล่าสุด")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="วันที่แก้ไข")
    
    # ข้อมูลเพิ่มเติม
    customer_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="ชื่อลูกค้า (ถ้ามี)"
    )
    reference_id = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        verbose_name="เลขที่อ้างอิง (เช่น Order ID)"
    )

    class Meta:
        db_table = 'issues'
        ordering = ['-created_at']
        verbose_name = 'กระทู้/ปัญหา'
        verbose_name_plural = 'กระทู้/ปัญหาทั้งหมด'

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"


class IssueUpdate(models.Model):
    """
    การอัปเดตความคืบหน้าของกระทู้
    """
    issue = models.ForeignKey(
        Issue, 
        on_delete=models.CASCADE, 
        related_name='updates',
        verbose_name="กระทู้"
    )
    message = models.TextField(verbose_name="ข้อความอัปเดต")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name="ผู้อัปเดต"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="วันที่อัปเดต")
    
    # สถานะเปลี่ยน
    old_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'issue_updates'
        ordering = ['created_at']
        verbose_name = 'การอัปเดตกระทู้'
        verbose_name_plural = 'การอัปเดตทั้งหมด'

    def __str__(self):
        return f"Update for {self.issue.title} by {self.updated_by}"