from rest_framework import serializers
from api.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'role', 'permissions', 'is_active']

    # ✅ ผู้ตรวจสอบ (mon) ดูภาพรวมเท่านั้น: พนักงาน / รายรับ-รายจ่าย / รายงาน
    # (ต้องตรงกับ MONITOR_PAGES ใน frontend useEmployeePermissions.ts)
    # ส่วนการกันแก้ไข/ลบ อยู่ที่ ReadOnlyRoleMiddleware ฝั่ง backend
    MONITOR_PAGES = ['employees', 'cashflow', 'reports']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('role') == 'mon':
            data['permissions'] = {key: True for key in self.MONITOR_PAGES}
        return data