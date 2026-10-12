from rest_framework import serializers
from api.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'role', 'permissions', 'is_active']

    # ✅ ผู้ตรวจสอบ (mon) เห็นได้ทุกหน้าเหมือน adm → ส่งสิทธิ์ทุกหน้าเป็น true ให้หน้าเว็บ
    # (ส่วนการกันแก้ไข/ลบ อยู่ที่ ReadOnlyRoleMiddleware ฝั่ง backend)
    ALL_PAGES = [
        'sale', 'customer', 'inventory', 'storage', 'gifts', 'registration',
        'calculator', 'npg', 'cashflow', 'board', 'employees', 'reports',
    ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('role') == 'mon':
            data['permissions'] = {key: True for key in self.ALL_PAGES}
        return data