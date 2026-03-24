from django.db import models
from .Gift import Gift

class OrderGift(models.Model):
    item = models.ForeignKey(Gift, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=0)