from rest_framework import serializers
from api.models import Issue, IssueUpdate
from django.contrib.auth import get_user_model

# ✅ ใช้ get_user_model() เพื่อดึง User model ที่ถูกต้อง
User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    """Serializer แบบง่ายสำหรับแสดงข้อมูล User"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class IssueUpdateSerializer(serializers.ModelSerializer):
    """Serializer สำหรับการอัปเดตกระทู้"""
    updated_by = UserSimpleSerializer(read_only=True)
    updated_by_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = IssueUpdate
        fields = [
            'id',
            'issue',
            'message',
            'updated_by',
            'updated_by_id',
            'created_at',
            'old_status',
            'new_status',
        ]
        read_only_fields = ['id', 'created_at', 'updated_by']


class IssueSerializer(serializers.ModelSerializer):
    """Serializer สำหรับกระทู้/ปัญหา"""
    created_by = UserSimpleSerializer(read_only=True)
    assigned_to = UserSimpleSerializer(read_only=True)
    resolved_by = UserSimpleSerializer(read_only=True)
    
    # สำหรับการสร้าง/แก้ไข
    created_by_id = serializers.IntegerField(write_only=True, required=False)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    resolved_by_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    # ดึงข้อมูลการอัปเดตทั้งหมด
    updates = IssueUpdateSerializer(many=True, read_only=True)
    
    # แสดงชื่อที่อ่านง่าย
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Issue
        fields = [
            'id',
            'title',
            'description',
            'category',
            'category_display',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'created_by',
            'created_by_id',
            'assigned_to',
            'assigned_to_id',
            'resolved_by',
            'resolved_by_id',
            'created_at',
            'updated_at',
            'resolved_at',
            'customer_name',
            'reference_id',
            'updates',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # แยก foreign key IDs ออก
        created_by_id = validated_data.pop('created_by_id', None)
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        
        issue = Issue.objects.create(**validated_data)
        
        if created_by_id:
            issue.created_by_id = created_by_id
        if assigned_to_id:
            issue.assigned_to_id = assigned_to_id
            
        issue.save()
        return issue

    def update(self, instance, validated_data):
        # ตรวจสอบการเปลี่ยนสถานะ
        old_status = instance.status
        new_status = validated_data.get('status', old_status)
        
        # อัปเดตข้อมูล
        for attr, value in validated_data.items():
            if attr.endswith('_id'):
                # จัดการ foreign key
                setattr(instance, attr, value)
            else:
                setattr(instance, attr, value)
        
        # ถ้าสถานะเปลี่ยนเป็น resolved และยังไม่มี resolved_at
        if new_status == 'resolved' and not instance.resolved_at:
            from django.utils import timezone
            instance.resolved_at = timezone.now()
            
        instance.save()
        return instance