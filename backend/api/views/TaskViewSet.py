# TaskViewSet.py
# วางไฟล์นี้ใน: backend/api/views/TaskViewSet.py
# แล้วเพิ่มบรรทัดนี้ใน backend/api/views/__init__.py:
#   from .TaskViewSet import TaskPostViewSet
# แล้ว register ใน urls.py (แถวเดียวกับ router.register('npg/accounts', ...)):
#   router.register('tasks/posts', TaskPostViewSet, basename='task-posts')
from django.apps import apps
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models.TaskPost import TaskPost, TaskAssignment
from api.serializers.TaskSerializer import TaskPostSerializer


class TaskPostViewSet(viewsets.ModelViewSet):
    """
    GET    /tasks/posts/                     รายการโพสต์ทั้งหมด (ล่าสุดก่อน)
    POST   /tasks/posts/                     สร้างโพสต์ใหม่ (เฉพาะ admin)
             body: { content, post_type: "general"|"assigned", employee_ids?: [1,2,...] }
    DELETE /tasks/posts/{id}/                 ลบโพสต์ (เฉพาะ admin)
    POST   /tasks/posts/{id}/toggle_status/   สลับสถานะทำแล้ว/ยังไม่ทำของ "ตัวเอง"
             admin สลับของคนอื่นได้โดยส่ง { employee_id } มาด้วย
    """
    queryset = TaskPost.objects.all().prefetch_related("assignments", "assignments__employee")
    serializer_class = TaskPostSerializer

    def _is_admin(self, request):
        return getattr(request.user, "role", None) == "adm"

    def _display_name(self, request):
        return getattr(request.user, "name", None) or getattr(request.user, "username", "") or ""

    def create(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่ประกาศได้"}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "กรุณากรอกเนื้อหา"}, status=status.HTTP_400_BAD_REQUEST)

        post_type = request.data.get("post_type") or "general"
        employee_ids = request.data.get("employee_ids") or []

        if post_type == "assigned" and not employee_ids:
            return Response({"error": "กรุณาเลือกพนักงานที่จะมอบหมาย"}, status=status.HTTP_400_BAD_REQUEST)

        post = TaskPost.objects.create(
            content=content,
            post_type=post_type,
            created_by=self._display_name(request),
        )

        if post_type == "assigned":
            User = apps.get_model("api", "User")
            employees = User.objects.filter(id__in=employee_ids)
            TaskAssignment.objects.bulk_create([
                TaskAssignment(post=post, employee=emp) for emp in employees
            ])

        return Response(self.get_serializer(post).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบได้"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="toggle_status")
    def toggle_status(self, request, pk=None):
        post = self.get_object()
        is_admin = self._is_admin(request)

        employee_id = request.data.get("employee_id")
        target_id = employee_id if (employee_id and is_admin) else request.user.id

        try:
            assignment = post.assignments.get(employee_id=target_id)
        except TaskAssignment.DoesNotExist:
            return Response({"error": "ไม่พบงานที่มอบหมายให้คนนี้"}, status=status.HTTP_404_NOT_FOUND)

        assignment.status = "done" if assignment.status == "pending" else "pending"
        assignment.completed_at = timezone.now() if assignment.status == "done" else None
        assignment.save()

        return Response(self.get_serializer(post).data)