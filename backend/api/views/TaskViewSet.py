# TaskViewSet.py
# วางไฟล์นี้ใน: backend/api/views/TaskViewSet.py
from django.apps import apps
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.models.TaskPost import TaskPost, TaskAssignment
from api.serializers.TaskSerializer import TaskPostSerializer


class TaskPostViewSet(viewsets.ModelViewSet):
    """
    GET    /tasks/posts/                     รายการโพสต์ - admin เห็นหมด, พนักงานเห็นเฉพาะ
             ประกาศทั่วไป + โพสต์ที่ตัวเองถูกมอบหมาย + โพสต์ที่ตัวเองสร้างเอง
    POST   /tasks/posts/                     สร้างโพสต์ใหม่ (ใครก็ได้)
             body: { content, post_type: "general"|"assigned",
                      due_date?: ISO string|null,                    # เฉพาะ post_type="general"
                      assignments?: [{ employee_id, due_date }] }    # เฉพาะ post_type="assigned"
             due_date เป็น ISO datetime string หรือ null (ไม่บังคับ)
    DELETE /tasks/posts/{id}/                 ลบโพสต์ (เฉพาะ admin หรือคนที่โพสต์เอง)
    POST   /tasks/posts/{id}/set_status/       ตั้งสถานะของ "ตัวเอง"
             body: { status, note? }
             admin ตั้งของคนอื่นได้โดยส่ง { employee_id } มาด้วย
    """
    serializer_class = TaskPostSerializer

    def get_queryset(self):
        qs = TaskPost.objects.all().prefetch_related("assignments", "assignments__employee")
        if self._is_admin(self.request):
            return qs
        username = getattr(self.request.user, "username", None)
        return qs.filter(
            Q(post_type="general")
            | Q(assignments__employee__username=username)
            | Q(created_by_username=username)
        ).distinct()

    def _is_admin(self, request):
        return getattr(request.user, "role", None) == "adm"

    def _display_name(self, request):
        return getattr(request.user, "name", None) or getattr(request.user, "username", "") or ""

    def create(self, request, *args, **kwargs):
        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "กรุณากรอกเนื้อหา"}, status=status.HTTP_400_BAD_REQUEST)

        post_type = request.data.get("post_type") or "general"
        assignments_data = request.data.get("assignments") or []

        if post_type == "assigned" and not assignments_data:
            return Response({"error": "กรุณาเลือกคนที่จะมอบหมาย"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ กำหนดเวลาของ "ประกาศทั่วไป" เอง (ตอนเป็น assigned ไม่ใช้ตรงนี้ - แยกรายคนแทน)
        post_due_date = request.data.get("due_date") if post_type == "general" else None

        post = TaskPost.objects.create(
            content=content,
            post_type=post_type,
            created_by=self._display_name(request),
            created_by_username=getattr(request.user, "username", "") or "",
            due_date=post_due_date or None,
        )

        if post_type == "assigned":
            User = apps.get_model("api", "User")
            ids = [a.get("employee_id") for a in assignments_data if a.get("employee_id")]
            employees = {e.id: e for e in User.objects.filter(id__in=ids)}

            objs = []
            for a in assignments_data:
                eid = a.get("employee_id")
                if eid in employees:
                    objs.append(TaskAssignment(
                        post=post,
                        employee=employees[eid],
                        due_date=a.get("due_date") or None,
                    ))
            TaskAssignment.objects.bulk_create(objs)

        return Response(self.get_serializer(post).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        is_owner = post.created_by_username == getattr(request.user, "username", None)
        if not (self._is_admin(request) or is_owner):
            return Response({"error": "ลบได้เฉพาะ admin หรือคนที่โพสต์เองเท่านั้น"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        post = self.get_object()
        is_admin = self._is_admin(request)

        new_status = request.data.get("status")
        valid_statuses = [c[0] for c in TaskAssignment.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"error": "สถานะไม่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)

        employee_id = request.data.get("employee_id")
        target_id = employee_id if (employee_id and is_admin) else request.user.id

        try:
            assignment = post.assignments.get(employee_id=target_id)
        except TaskAssignment.DoesNotExist:
            return Response({"error": "ไม่พบงานที่มอบหมายให้คนนี้"}, status=status.HTTP_404_NOT_FOUND)

        assignment.status = new_status
        if "note" in request.data:
            assignment.note = request.data.get("note") or ""
        assignment.completed_at = timezone.now() if new_status == "done" else None
        assignment.save()

        return Response(self.get_serializer(post).data)