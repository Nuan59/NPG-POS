"""
✅ ดูบันทึกการทำงานของพนักงาน (adm / ผู้ตรวจสอบ mon เท่านั้น) - อ่านอย่างเดียว ไม่มีแก้/ลบ
GET /activity-logs/?user_id=&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&q=&errors=1&page=1&page_size=50
GET /activity-logs/users/   รายชื่อคนที่มีในบันทึก (ใช้ทำตัวกรอง)
"""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api import activity

BKK = ZoneInfo("Asia/Bangkok")
VIEW_ROLES = activity.ADMIN_ROLES | {"mon"}


def _can_view(user):
    return str(getattr(user, "role", "") or "").lower() in VIEW_ROLES


def _day_start_utc(date_str, plus_days=0):
    d = datetime.strptime(date_str, "%Y-%m-%d").date() + timedelta(days=plus_days)
    return datetime.combine(d, time.min, tzinfo=BKK).astimezone(ZoneInfo("UTC"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_logs(request):
    if not _can_view(request.user):
        return Response({"error": "เฉพาะผู้ดูแลระบบ"}, status=403)
    activity.ensure_table()

    p = request.query_params
    where, params = [], []
    if p.get("user_id"):
        try:
            where.append("user_id = %s")
            params.append(int(p["user_id"]))
        except ValueError:
            return Response({"error": "user_id ไม่ถูกต้อง"}, status=400)
    try:
        if p.get("date_from"):
            where.append("created_at >= %s")
            params.append(_day_start_utc(p["date_from"]))
        if p.get("date_to"):
            where.append("created_at < %s")
            params.append(_day_start_utc(p["date_to"], plus_days=1))
    except ValueError:
        return Response({"error": "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"}, status=400)
    if p.get("errors") in ("1", "true"):
        where.append("status >= 400")
    q = (p.get("q") or "").strip()
    if q:
        like = f"%{q.lower()}%"
        where.append("(LOWER(action) LIKE %s OR LOWER(detail) LIKE %s OR LOWER(path) LIKE %s "
                     "OR LOWER(user_name) LIKE %s OR LOWER(username) LIKE %s OR LOWER(payload) LIKE %s)")
        params += [like] * 6

    try:
        page = max(int(p.get("page") or 1), 1)
        page_size = min(max(int(p.get("page_size") or 50), 1), 500)
    except ValueError:
        page, page_size = 1, 50

    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with connection.cursor() as c:
        c.execute(f"SELECT COUNT(*) FROM {activity.TABLE} {clause}", params)
        total = c.fetchone()[0]
        c.execute(
            f"""SELECT id, created_at, user_id, username, user_name, role, method, path, status,
                       action, detail, payload, ip, duration_ms
                FROM {activity.TABLE} {clause}
                ORDER BY created_at DESC, id DESC
                LIMIT %s OFFSET %s""",
            params + [page_size, (page - 1) * page_size],
        )
        cols = [col[0] for col in c.description]
        rows = [dict(zip(cols, r)) for r in c.fetchall()]

    for r in rows:
        ts = r["created_at"]
        if isinstance(ts, str):  # sqlite
            try:
                ts = datetime.fromisoformat(ts).replace(tzinfo=ZoneInfo("UTC"))
            except ValueError:
                ts = None
        elif ts is not None and ts.tzinfo is None:
            ts = ts.replace(tzinfo=ZoneInfo("UTC"))
        r["created_at"] = ts.astimezone(BKK).isoformat() if ts else None

    return Response({"total": total, "page": page, "page_size": page_size, "results": rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_log_users(request):
    if not _can_view(request.user):
        return Response({"error": "เฉพาะผู้ดูแลระบบ"}, status=403)
    activity.ensure_table()
    with connection.cursor() as c:
        c.execute(
            f"""SELECT user_id, MAX(username), MAX(user_name), COUNT(*)
                FROM {activity.TABLE} WHERE user_id IS NOT NULL
                GROUP BY user_id ORDER BY MAX(user_name), MAX(username)"""
        )
        users = [{"id": r[0], "username": r[1], "name": r[2] or r[1], "count": r[3]} for r in c.fetchall()]
    return Response(users)
