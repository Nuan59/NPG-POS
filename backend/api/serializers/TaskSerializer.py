# TaskSerializer.py
# วางไฟล์นี้ใน: backend/api/serializers/TaskSerializer.py
from rest_framework import serializers
from api.models.TaskPost import TaskPost, TaskAssignment


class TaskAssignmentSerializer(serializers.ModelSerializer):
    employee_id = serializers.IntegerField(source="employee.id", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    # ✅ ใช้ username เทียบฝั่ง frontend ว่า "นี่คืองานของฉันเอง" เพราะ session ฝั่ง frontend
    # มี username แน่นอน แต่ id ตัวเลขอาจไม่มีติดมาด้วย
    employee_username = serializers.CharField(source="employee.username", read_only=True)
    is_overdue = serializers.SerializerMethodField()
    # ✅ ใกล้ครบกำหนด - เตือนล่วงหน้า 1 วันก่อนถึงกำหนด (ยังไม่เกินกำหนด แต่เหลือ ≤1 วัน)
    is_due_soon = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = [
            "id", "employee_id", "employee_name", "employee_username",
            "status", "note", "due_date", "is_overdue", "is_due_soon", "completed_at",
        ]

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.status == "done":
            return False
        if not obj.due_date:
            return False
        return obj.due_date < timezone.now()

    def get_is_due_soon(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        if obj.status == "done":
            return False
        if not obj.due_date:
            return False
        now = timezone.now()
        if obj.due_date < now:
            return False  # เกินกำหนดไปแล้ว นับเป็น overdue ไม่ใช่ due_soon
        return obj.due_date <= now + timedelta(days=1)


class TaskPostSerializer(serializers.ModelSerializer):
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    # ✅ กำหนดเวลาของโพสต์เอง - มีความหมายเฉพาะ "ประกาศทั่วไป" (post_type=general)
    is_overdue = serializers.SerializerMethodField()
    is_due_soon = serializers.SerializerMethodField()

    class Meta:
        model = TaskPost
        fields = [
            "id", "content", "post_type", "created_by", "created_by_username",
            "due_date", "is_overdue", "is_due_soon", "created_at", "assignments",
        ]
        read_only_fields = ["id", "created_by", "created_by_username", "created_at"]

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if not obj.due_date:
            return False
        return obj.due_date < timezone.now()

    def get_is_due_soon(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        if not obj.due_date:
            return False
        now = timezone.now()
        if obj.due_date < now:
            return False
        return obj.due_date <= now + timedelta(days=1)