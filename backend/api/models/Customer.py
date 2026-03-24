# -*- coding: utf-8 -*-
from django.utils import timezone
from django.db import models
import requests

class Customer(models.Model):
    GENDERS = [
        ("M", "ชาย"),
        ("F", "หญิง"),
    ]

    name = models.CharField(max_length=100)
    id_card_number = models.CharField(max_length=13)
    age = models.IntegerField()
    dob = models.DateField(null=True, blank=True)

    address = models.CharField(max_length=200)
    district = models.CharField(max_length=200, null=True, blank=True)
    subdistrict = models.CharField(max_length=200, null=True, blank=True)
    province = models.CharField(max_length=200, null=True, blank=True)
    postal_code = models.CharField(max_length=5, null=True, blank=True, verbose_name="รหัสไปรษณีย์")  # ✅ เพิ่มฟิลด์นี้
    
    # ฟิลด์สำหรับเก็บพิกัดแผนที่
    latitude = models.FloatField(null=True, blank=True, verbose_name="ละติจูด")
    longitude = models.FloatField(null=True, blank=True, verbose_name="ลองจิจูด")

    gender = models.CharField(
        max_length=1,
        choices=GENDERS
    )
    phone = models.CharField(max_length=12)

    def __str__(self):
        return self.name

    def is_birthday_today(self):
        if self.dob:
            today = timezone.now().date()
            return self.dob.day == today.day and self.dob.month == today.month
        return False
    
    def geocode_address(self):
        """
        ใช้ Google Geocoding API เพื่อหาพิกัดจากที่อยู่
        """
        # ถ้ามีพิกัดอยู่แล้วไม่ต้องหาใหม่
        if self.latitude and self.longitude:
            return True
        
        # สร้างที่อยู่เต็ม
        full_address = f"{self.address}"
        if self.subdistrict:
            full_address += f", ต.{self.subdistrict}"
        if self.district:
            full_address += f", อ.{self.district}"
        if self.province:
            full_address += f", จ.{self.province}"
        if self.postal_code:  # ✅ เพิ่มรหัสไปรษณีย์
            full_address += f", {self.postal_code}"
        full_address += ", ประเทศไทย"
        
        # เรียก Google Geocoding API
        try:
            # ⚠️ ใส่ API Key ของคุณที่นี่
            api_key = "AIzaSyAZr4GxoUEOp1u7UDB4jzN-Li51NfGA3Ac"  # ใช้ตัวเดียวกับ Maps ได้
            
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                'address': full_address,
                'key': api_key,
                'language': 'th',
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data['status'] == 'OK' and len(data['results']) > 0:
                location = data['results'][0]['geometry']['location']
                self.latitude = location['lat']
                self.longitude = location['lng']
                print(f"✅ Geocoded: {self.name} -> ({self.latitude}, {self.longitude})")
                return True
            else:
                print(f"❌ Geocoding failed for {self.name}: {data.get('status')}")
                return False
                
        except Exception as e:
            print(f"❌ Geocoding error for {self.name}: {e}")
            return False
    
    def save(self, *args, **kwargs):
        """
        Override save เพื่อ geocode อัตโนมัติก่อนบันทึก
        """
        # ถ้ายังไม่มีพิกัด ให้ลอง geocode
        if not self.latitude or not self.longitude:
            if self.address:  # ต้องมีที่อยู่ก่อน
                self.geocode_address()
        
        super().save(*args, **kwargs)