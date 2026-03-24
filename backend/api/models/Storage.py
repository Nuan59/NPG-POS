from django.db import models

class Storage(models.Model):
    storage_name = models.CharField(max_length=200)
    address = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)

    def __str__(self):
        return self.storage_name
    
