# TaskViewSet.py
# วางไฟล์นี้ใน: backend/api/views/TaskViewSet.py
from django.apps import apps
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from zoneinfo import ZoneInfo
from django.db import transaction

from api.models.TaskPost import TaskPost, TaskAssignment, TaskProgressLog, TaskCheckin, TaskAssignmentTouch, DailyNote

# ✅ Note ปิดร้าน - เช็คลิสต์ (key, ข้อความ) ต้องติ๊กครบทุกข้อ / "ส่งเงิน" ระบบเช็คให้เอง (ไม่มีเงินสดค้างส่ง)
DAILY_NOTE_CHECKLIST = [
    ("cashflow", "💰 ลงรายรับ-รายจ่ายวันนี้ครบ"),
]


def _unsent_cash(username):
    """(จำนวนรายการ, ยอด) เงินสดค้างส่งของพนักงาน - เช็คไม่ได้ (เช่น ยังไม่มีตาราง) คืน (0, 0)"""
    try:
        from api.views.CashHandoverViewSet import _collect_unsent
        rows = _collect_unsent(username)
        return len(rows), float(sum(r["amount"] for r in rows))
    except Exception:
        return 0, 0.0


def _note_json(n):
    return {
        "date": n.date, "checklist": n.checklist or {}, "today": n.today, "issue": n.issue,
        "tomorrow": n.tomorrow, "created_at": n.created_at, "updated_at": n.updated_at,
    }
from api.serializers.TaskSerializer import TaskPostSerializer


def _today_bkk():
    return timezone.localtime(timezone.now(), ZoneInfo("Asia/Bangkok")).date()


def _touch(assignment):
    """บันทึกเวลาอัปเดตงานล่าสุด - พังก็ไม่ให้งานหลักพัง (เช่น ยังไม่ได้สร้างตาราง)"""
    try:
        with transaction.atomic():
            TaskAssignmentTouch.objects.update_or_create(
                assignment=assignment, defaults={"last_update_at": timezone.now()}
            )
    except Exception:
        pass


def _is_reviewer_role(user):
    return str(getattr(user, "role", "") or "").lower() in ("adm", "mon")


def _assignment_brief(a, last_update=None):
    now = timezone.now()
    overdue = bool(a.due_date and a.status != "done" and a.due_date < now)
    return {
        "assignment_id": a.id,
        "post_id": a.post_id,
        "content": a.post.content,
        "created_by": a.post.created_by,
        "status": a.status,
        "note": a.note,
        "due_date": a.due_date,
        "is_overdue": overdue,
        "target_quantity": a.target_quantity,
        "target_unit": a.target_unit,
        "current_progress": a.current_progress,
        "last_update_at": last_update,
    }


class TaskPostViewSet(viewsets.ModelViewSet):
    """
    GET    /tasks/posts/                     รายการโพสต์ - admin เห็นหมด, พนักงานเห็นเฉพาะ
             ประกาศทั่วไป + โพสต์ที่ตัวเองถูกมอบหมาย + โพสต์ที่ตัวเองสร้างเอง
    POST   /tasks/posts/                     สร้างโพสต์ใหม่ (ใครก็ได้)
             body: { content, post_type: "general"|"assigned",
                      due_date?: ISO string|null,                    # เฉพาะ post_type="general"
                      assignments?: [{ employee_id, due_date,
                                       target_quantity?, target_unit? }] }   # เฉพาะ post_type="assigned"
             due_date เป็น ISO datetime string หรือ null (ไม่บังคับ)
             target_quantity/target_unit ไม่บังคับ - ใส่เมื่อจะติดตามความคืบหน้าเป็นจำนวน (เช่น ลอกลาย 200 คัน)
    DELETE /tasks/posts/{id}/                 ลบโพสต์ (เฉพาะ admin หรือคนที่โพสต์เอง)
    POST   /tasks/posts/{id}/set_status/       ตั้งสถานะของ "ตัวเอง"
             body: { status, note? }
             admin ตั้งของคนอื่นได้โดยส่ง { employee_id } มาด้วย
    POST   /tasks/posts/{id}/add_progress/     อัปเดตความคืบหน้ารายวันของ "ตัวเอง" (บวกสะสม)
             body: { amount, note? }
             admin อัปเดตของคนอื่นได้โดยส่ง { employee_id } มาด้วย
    """
    serializer_class = TaskPostSerializer

    def get_queryset(self):
        qs = TaskPost.objects.all().prefetch_related("assignments", "assignments__employee", "assignments__progress_logs")
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
                    target_qty = a.get("target_quantity")
                    try:
                        target_qty = int(target_qty) if target_qty not in (None, "") else None
                    except (TypeError, ValueError):
                        target_qty = None
                    objs.append(TaskAssignment(
                        post=post,
                        employee=employees[eid],
                        due_date=a.get("due_date") or None,
                        target_quantity=target_qty,
                        target_unit=(a.get("target_unit") or "").strip(),
                    ))
            TaskAssignment.objects.bulk_create(objs)

        return Response(self.get_serializer(post).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        is_owner = post.created_by_username == getattr(request.user, "username", None)
        if not (self._is_admin(request) or is_owner):
            return Response({"error": "ลบได้เฉพาะ admin หรือคนที่โพสต์เองเท่านั้น"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def _resolve_assignment(self, request, post):
        """หา assignment เป้าหมาย - ของตัวเอง หรือของคนอื่นถ้าเป็น admin และส่ง employee_id มา"""
        is_admin = self._is_admin(request)
        employee_id = request.data.get("employee_id")
        target_id = employee_id if (employee_id and is_admin) else request.user.id
        try:
            return post.assignments.get(employee_id=target_id), None
        except TaskAssignment.DoesNotExist:
            return None, Response({"error": "ไม่พบงานที่มอบหมายให้คนนี้"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["post"], url_path="set_status")
    def set_status(self, request, pk=None):
        post = self.get_object()

        new_status = request.data.get("status")
        valid_statuses = [c[0] for c in TaskAssignment.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"error": "สถานะไม่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)

        assignment, error = self._resolve_assignment(request, post)
        if error:
            return error

        assignment.status = new_status
        if "note" in request.data:
            assignment.note = request.data.get("note") or ""
        assignment.completed_at = timezone.now() if new_status == "done" else None
        assignment.save()
        _touch(assignment)

        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=["post"], url_path="add_progress")
    def add_progress(self, request, pk=None):
        post = self.get_object()

        try:
            amount = int(request.data.get("amount"))
        except (TypeError, ValueError):
            return Response({"error": "จำนวนไม่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)

        if amount == 0:
            return Response({"error": "กรุณากรอกจำนวนที่มากกว่า 0"}, status=status.HTTP_400_BAD_REQUEST)

        assignment, error = self._resolve_assignment(request, post)
        if error:
            return error

        note = (request.data.get("note") or "").strip()
        TaskProgressLog.objects.create(assignment=assignment, amount=amount, note=note)

        assignment.current_progress = assignment.current_progress + amount
        # ✅ ถึงเป้าหมายแล้ว - เปลี่ยนสถานะเป็น "ทำแล้ว" ให้อัตโนมัติ (เฉพาะกรณีตั้งเป้าหมายไว้)
        if assignment.target_quantity and assignment.current_progress >= assignment.target_quantity:
            assignment.status = "done"
            assignment.completed_at = timezone.now()
        assignment.save()
        _touch(assignment)

        return Response(self.get_serializer(post).data)

    # ================== เช็คอินงานประจำวัน ==================
    # GET  /tasks/posts/checkin/            งานค้างของฉัน + ต้องเช็คอินวันนี้ไหม (required)
    # POST /tasks/posts/checkin/            { items: [{ assignment_id, status, note?, add? }] }
    #        ต้องส่งครบทุกงานที่ค้าง / ติดปัญหาต้องมีหมายเหตุ / add = ทำเพิ่มวันนี้ (งานที่มีเป้าจำนวน)
    # GET  /tasks/posts/checkin_overview/   (adm / ผู้ตรวจสอบ) สรุปรายคน: เช็คอินแล้วไหม + งานค้าง + อัปเดตล่าสุด
    # adm / ผู้ตรวจสอบ ไม่ต้องเช็คอิน

    def _open_assignments(self, user):
        return (
            TaskAssignment.objects.filter(employee=user, post__post_type="assigned")
            .exclude(status="done")
            .select_related("post")
            .order_by("due_date", "id")
        )

    @action(detail=False, methods=["get", "post"], url_path="checkin")
    def checkin(self, request):
        user = request.user
        today = _today_bkk()
        if request.method == "GET":
            if _is_reviewer_role(user):
                return Response({"required": False, "date": today, "tasks": []})
            try:
                checked = TaskCheckin.objects.filter(user=user, date=today).exists()
            except Exception:
                # ยังไม่ได้สร้างตาราง - ไม่บล็อกใคร
                return Response({"required": False, "date": today, "tasks": [], "error": "no_table"})
            rows = list(self._open_assignments(user))
            touches = dict(
                TaskAssignmentTouch.objects.filter(assignment__in=rows).values_list("assignment_id", "last_update_at")
            )
            tasks = [_assignment_brief(a, touches.get(a.id)) for a in rows]
            tasks.sort(key=lambda t: (not t["is_overdue"], t["due_date"] is None, str(t["due_date"] or "")))
            return Response({"required": bool(tasks) and not checked, "checked": checked, "date": today, "tasks": tasks})

        # POST
        items = request.data.get("items") or []
        by_id = {}
        for it in items:
            try:
                by_id[int(it.get("assignment_id"))] = it
            except (TypeError, ValueError, AttributeError):
                continue
        valid = [c[0] for c in TaskAssignment.STATUS_CHOICES]
        with transaction.atomic():
            rows = list(self._open_assignments(user).select_for_update(of=("self",)))
            missing = [a for a in rows if a.id not in by_id]
            if missing:
                return Response(
                    {"error": f"ยังไม่ได้อัปเดตอีก {len(missing)} งาน", "missing": [a.id for a in missing]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # ตรวจครบทุกงานก่อน แล้วค่อยบันทึก (กันบันทึกไปครึ่งเดียวแล้วเจอข้อผิดพลาด)
            for a in rows:
                it = by_id[a.id]
                st = it.get("status")
                if st not in valid:
                    return Response({"error": f"สถานะไม่ถูกต้อง: {a.post.content[:40]}"}, status=status.HTTP_400_BAD_REQUEST)
                if st == "issue" and not str(it.get("note") or "").strip():
                    return Response({"error": f"ติดปัญหาต้องบอกว่าติดอะไร: {a.post.content[:40]}"}, status=status.HTTP_400_BAD_REQUEST)
            for a in rows:
                it = by_id[a.id]
                st = it.get("status")
                note = str(it.get("note") or "").strip()
                try:
                    add = int(it.get("add") or 0)
                except (TypeError, ValueError):
                    add = 0
                if add > 0 and a.target_quantity:
                    TaskProgressLog.objects.create(assignment=a, amount=add, note="เช็คอินประจำวัน")
                    a.current_progress += add
                    if a.current_progress >= a.target_quantity:
                        st = "done"
                a.status = st
                if note or st == "issue":
                    a.note = note
                a.completed_at = timezone.now() if st == "done" else None
                a.save()
                _touch(a)
            try:
                with transaction.atomic():
                    TaskCheckin.objects.get_or_create(user=user, date=_today_bkk())
            except Exception:
                return Response({"error": "ยังไม่ได้สร้างตารางเช็คอิน กรุณาแจ้ง adm"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"message": "เช็คอินแล้ว", "date": _today_bkk()})

    # ================== Note ปิดร้าน ==================
    # GET  /tasks/posts/daily_note/          note วันนี้ของฉัน + เงินสดค้างส่ง + เช็คลิสต์
    # POST /tasks/posts/daily_note/          { checklist: {key: true}, today, issue?, tomorrow? }
    #        ต้องไม่มีเงินสดค้างส่ง + ติ๊กเช็คลิสต์ครบ + เขียน "วันนี้" - ส่งแล้วแก้ได้ในวันเดียวกัน
    # GET  /tasks/posts/daily_note_list/?date=YYYY-MM-DD   (adm / ผู้ตรวจสอบ) note ของทุกคนวันนั้น (ย้อนหลังได้)

    @action(detail=False, methods=["get", "post"], url_path="daily_note")
    def daily_note(self, request):
        user = request.user
        today = _today_bkk()
        checklist_def = [{"key": k, "label": l} for k, l in DAILY_NOTE_CHECKLIST]
        if request.method == "GET":
            exempt = _is_reviewer_role(user)
            try:
                note = DailyNote.objects.filter(user=user, date=today).first()
            except Exception:
                return Response({"enabled": False, "error": "no_table"})
            n, amount = (0, 0.0) if exempt else _unsent_cash(user.username)
            return Response({
                "enabled": True, "exempt": exempt, "date": today, "checklist": checklist_def,
                "unsent_count": n, "unsent_amount": amount,
                "note": _note_json(note) if note else None,
            })

        if _is_reviewer_role(user):
            return Response({"error": "adm / ผู้ตรวจสอบ ไม่ต้องเขียน note ปิดร้าน"}, status=status.HTTP_400_BAD_REQUEST)
        n, amount = _unsent_cash(user.username)
        if n:
            return Response({"error": f"ยังมีเงินสดค้างส่ง {n} รายการ ({amount:,.0f} บาท) ส่งเงินก่อน"}, status=status.HTTP_400_BAD_REQUEST)
        checklist = request.data.get("checklist") or {}
        missing = [l for k, l in DAILY_NOTE_CHECKLIST if not checklist.get(k)]
        if missing:
            return Response({"error": "ยังไม่ได้ติ๊ก: " + ", ".join(missing)}, status=status.HTTP_400_BAD_REQUEST)
        today_text = str(request.data.get("today") or "").strip()
        if not today_text:
            return Response({"error": "กรุณาเขียนว่าวันนี้เกิดอะไรขึ้น"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            note, _ = DailyNote.objects.update_or_create(
                user=user, date=today,
                defaults={
                    "checklist": {k: True for k, _l in DAILY_NOTE_CHECKLIST},
                    "today": today_text[:3000],
                    "issue": str(request.data.get("issue") or "").strip()[:3000],
                    "tomorrow": str(request.data.get("tomorrow") or "").strip()[:3000],
                },
            )
        except Exception:
            return Response({"error": "ยังไม่ได้สร้างตาราง note ปิดร้าน กรุณาแจ้ง adm"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"message": "ส่ง note แล้ว", "note": _note_json(note)})

    @action(detail=False, methods=["get"], url_path="daily_note_list")
    def daily_note_list(self, request):
        if not _is_reviewer_role(request.user):
            return Response({"error": "เฉพาะ adm / ผู้ตรวจสอบ"}, status=status.HTTP_403_FORBIDDEN)
        from datetime import date as _date
        raw = request.query_params.get("date")
        try:
            day = _date.fromisoformat(raw) if raw else _today_bkk()
        except ValueError:
            return Response({"error": "วันที่ไม่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)
        User = apps.get_model("api", "User")
        try:
            notes = {n.user_id: n for n in DailyNote.objects.filter(date=day)}
        except Exception:
            return Response({"error": "ยังไม่ได้สร้างตาราง (เปิด /dev/create-daily-note-table/)"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        people = []
        seen = set()
        for u in User.objects.filter(is_active=True).exclude(role__in=["adm", "mon"]).order_by("name"):
            n = notes.get(u.id)
            seen.add(u.id)
            people.append({"user_id": u.id, "name": u.name or u.username, "note": _note_json(n) if n else None})
        for uid, n in notes.items():  # คนที่ส่ง note แล้วแต่ถูกปิดบัญชี/เปลี่ยนสิทธิ์ไปทีหลัง
            if uid not in seen:
                people.append({"user_id": uid, "name": n.user.name or n.user.username, "note": _note_json(n)})
        people.sort(key=lambda p: (p["note"] is not None, p["name"]))
        return Response({
            "date": day, "checklist": [{"key": k, "label": l} for k, l in DAILY_NOTE_CHECKLIST], "people": people,
        })

    @action(detail=False, methods=["get"], url_path="checkin_overview")
    def checkin_overview(self, request):
        if not _is_reviewer_role(request.user):
            return Response({"error": "เฉพาะ adm / ผู้ตรวจสอบ"}, status=status.HTTP_403_FORBIDDEN)
        User = apps.get_model("api", "User")
        today = _today_bkk()
        try:
            checked_ids = set(TaskCheckin.objects.filter(date=today).values_list("user_id", flat=True))
        except Exception:
            return Response({"error": "ยังไม่ได้สร้างตารางเช็คอิน (เปิด /dev/create-task-checkin-tables/)"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        open_rows = list(
            TaskAssignment.objects.filter(post__post_type="assigned").exclude(status="done").select_related("post", "employee")
        )
        touches = dict(
            TaskAssignmentTouch.objects.filter(assignment__in=open_rows).values_list("assignment_id", "last_update_at")
        )
        people = {}
        for u in User.objects.filter(is_active=True).exclude(role__in=["adm", "mon"]):
            people[u.id] = {"user_id": u.id, "name": u.name or u.username, "checked_today": u.id in checked_ids, "tasks": []}
        for a in open_rows:
            p = people.get(a.employee_id)
            if p is None:
                continue
            p["tasks"].append(_assignment_brief(a, touches.get(a.id)))
        result = sorted(people.values(), key=lambda p: (p["checked_today"] or not p["tasks"], -len(p["tasks"]), p["name"]))
        return Response({"date": today, "people": result})