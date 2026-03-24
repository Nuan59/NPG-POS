from django.db import models

class AdditionalFee(models.Model):
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=9, decimal_places=2)

    def __str__(self):
        return self.description
    