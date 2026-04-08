from django.db import models
from .Storage import Storage

class Bike(models.Model):
    model_name = models.CharField(max_length=200)
    model_code = models.CharField(max_length=100)
    engine     = models.CharField(max_length=100, null=True)
    chassi     = models.CharField(max_length=100, unique=True)  # ✅ ใช้ chassi ตรงกับ DB
    registration_plate = models.CharField(max_length=20, null=True, blank=True)
    registration_expiry_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=50, null=True)
    notes      = models.TextField(null=True, blank=True)

    CATEGORY_CHOICES = [
        ('new', 'New'),
        ('pre_owned', 'Pre-owned')
    ]
    category   = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='new')

    sale_price = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    wholesale_price = models.CharField(max_length=20, null=True, blank=True)
    wholesale_price_net = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    received_date = models.DateField(auto_now_add=False, null=True)

    sold       = models.BooleanField(default=False)

    BRAND_CHOICES = [
        ('Honda', 'Honda'),
        ('Yamaha', 'Yamaha'),
        ('GPX', 'GPX'),
        ('RYUKA','RYUKA'),
        ('Lambretta','Lambretta'),
        ('Vespa','Vespa'),
    ]
    brand = models.CharField(max_length=20, choices=BRAND_CHOICES, default='Honda', null=True)

    storage_place = models.ForeignKey(Storage, on_delete=models.SET_NULL, null=True)

    invoice_number = models.CharField(max_length=100, default='', blank=True, null=True)
    invoice_picture = models.ImageField(upload_to='invoices/%Y/%m/', blank=True, null=True)

    def __str__(self) -> str:
        return self.model_name