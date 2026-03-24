from django.db import models
from .Storage import Storage
from .Bike import Bike


class StorageTransfer(models.Model):
    transfer_date = models.DateField(auto_now_add=True)
    bikes = models.ManyToManyField(Bike)
    origin = models.ForeignKey(Storage, on_delete=models.SET_NULL, null=True, related_name='origin_transfer')
    destination = models.ForeignKey(Storage, on_delete=models.SET_NULL, null=True, related_name='destination_transfer')
    