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

    class Meta:
        model = TaskAssignment
        fields = ["id", "employee_id", "employee_name", "employee_username", "status", "note", "completed_at"]


class TaskPostSerializer(serializers.ModelSerializer):
    assignments = TaskAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = TaskPost
        fields = ["id", "content", "post_type", "created_by", "created_by_username", "created_at", "assignments"]
        read_only_fields = ["id", "created_by", "created_by_username", "created_at"]