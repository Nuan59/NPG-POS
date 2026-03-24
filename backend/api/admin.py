from django.contrib import admin
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from .models import User, Order, Customer


class UserAdmin(admin.ModelAdmin):
    pass


class SalesAdmin(admin.ModelAdmin):
    pass


# ✅ เพิ่ม CustomerAdmin ใหม่
@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'district', 'province', 'has_location', 'id']
    list_filter = ['district', 'province', 'gender']
    search_fields = ['name', 'phone', 'address', 'id_card_number']
    
    # แสดงฟิลด์ในหน้าแก้ไข
    fieldsets = (
        ('ข้อมูลส่วนตัว', {
            'fields': ('name', 'id_card_number', 'age', 'dob', 'gender', 'phone')
        }),
        ('ที่อยู่', {
            'fields': ('address', 'subdistrict', 'district', 'province')
        }),
        ('พิกัดแผนที่ (อัตโนมัติ)', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',),  # ซ่อนไว้ได้
            'description': 'พิกัดจะถูกหาอัตโนมัติเมื่อบันทึกลูกค้าใหม่'
        }),
    )
    
    readonly_fields = []  # latitude, longitude สามารถแก้ไขได้ (กรณีต้องการปรับ)
    
    def has_location(self, obj):
        """แสดงว่ามีพิกัดหรือไม่"""
        if obj.latitude and obj.longitude:
            return "✅"
        return "❌"
    has_location.short_description = 'มีพิกัด'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:customer_id>/geocode/',
                self.admin_site.admin_view(self.geocode_customer),
                name='customer-geocode',
            ),
            path(
                'geocode-all/',
                self.admin_site.admin_view(self.geocode_all_customers),
                name='customer-geocode-all',
            ),
        ]
        return custom_urls + urls
    
    def geocode_customer(self, request, customer_id):
        """Geocode ลูกค้าคนเดียว"""
        customer = Customer.objects.get(pk=customer_id)
        
        if customer.geocode_address():
            customer.save()
            messages.success(request, f'หาพิกัดสำเร็จ: {customer.name} ({customer.latitude}, {customer.longitude})')
        else:
            messages.error(request, f'ไม่สามารถหาพิกัดสำหรับ {customer.name} ได้')
        
        return redirect('admin:api_customer_change', customer_id)
    
    def geocode_all_customers(self, request):
        """Geocode ลูกค้าทั้งหมดที่ยังไม่มีพิกัด"""
        customers = Customer.objects.filter(latitude__isnull=True)
        success = 0
        failed = 0
        
        for customer in customers:
            if customer.geocode_address():
                customer.save()
                success += 1
            else:
                failed += 1
        
        messages.success(request, f'หาพิกัดสำเร็จ: {success} คน, ล้มเหลว: {failed} คน')
        return redirect('admin:api_customer_changelist')
    
    actions = ['geocode_selected_customers']
    
    def geocode_selected_customers(self, request, queryset):
        """Geocode ลูกค้าที่เลือก"""
        success = 0
        failed = 0
        
        for customer in queryset:
            if customer.geocode_address():
                customer.save()
                success += 1
            else:
                failed += 1
        
        self.message_user(request, f'หาพิกัดสำเร็จ: {success} คน, ล้มเหลว: {failed} คน')
    
    geocode_selected_customers.short_description = "🗺️ หาพิกัดแผนที่สำหรับลูกค้าที่เลือก"


# ลงทะเบียน Model เดิม
admin.site.register(Order, SalesAdmin)
admin.site.register(User, UserAdmin)