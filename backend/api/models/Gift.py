from django.db import models

class Gift(models.Model): 
    name = models.CharField(max_length=100)
    price = models.IntegerField()
    stock = models.IntegerField()
    wholesale_price = models.IntegerField(null=True, blank=True, verbose_name="ขายส่ง")

    def __str__(self):
        return self.name