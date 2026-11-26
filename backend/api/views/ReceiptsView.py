"""
✅ ทะเบียนใบเสร็จชั่วคราว
GET /receipts/?q=&date_from=&date_to=&kind=&status=&bike=&page=&page_size=
- พนักงาน: เห็นเฉพาะใบที่ใช้งานอยู่ (พิมพ์ซ้ำได้)
- adm / ผู้ตรวจสอบ: เห็นใบที่ยกเลิกด้วย (ใคร / เมื่อไหร่) + ยอดรวม
"""
from datetime import datetime
from decimal import Decimal

from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api import receipts

REVIEW_ROLES = {"adm", "admin", "administrator", "mon"}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def receipt_list(request):
    receipts.ensure_tables()
    reviewer = str(getattr(request.user, "role", "") or "").lower() in REVIEW_ROLES
    p = request.query_params
    where, params = [], []

    status = p.get("status") or "active"
    if not reviewer:
        status = "active"  # 🔒 ใบที่ยกเลิก เห็นเฉพาะ adm / ผู้ตรวจสอบ
    if status in ("active", "cancelled"):
        where.append("status = %s")
        params.append(status)
    if p.get("kind") in receipts.KIND_LABEL:
        where.append("kind = %s")
        params.append(p["kind"])
    if p.get("bike"):
        try:
            where.append("bike_id = %s")
            params.append(int(p["bike"]))
        except ValueError:
            return Response({"error": "bike ไม่ถูกต้อง"}, status=400)
    try:
        if p.get("date_from"):
            where.append("receipt_date >= %s")
            params.append(datetime.strptime(p["date_from"], "%Y-%m-%d").date())
        if p.get("date_to"):
            where.append("receipt_date <= %s")
            params.append(datetime.strptime(p["date_to"], "%Y-%m-%d").date())
    except ValueError:
        return Response({"error": "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"}, status=400)
    q = (p.get("q") or "").strip().lower()
    if q:
        like = f"%{q}%"
        where.append("(LOWER(number) LIKE %s OR LOWER(customer) LIKE %s OR LOWER(description) LIKE %s "
                     "OR LOWER(category) LIKE %s OR LOWER(created_by) LIKE %s)")
        params += [like] * 5

    try:
        page = max(int(p.get("page") or 1), 1)
        size = min(max(int(p.get("page_size") or 50), 1), 500)
    except ValueError:
        page, size = 1, 50

    clause = ("WHERE " + " AND ".join(where)) if where else ""
    t = receipts.TABLE
    with connection.cursor() as c:
        c.execute(f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM {t} {clause}", params)
        total, amount_sum = c.fetchone()
        c.execute(
            f"""SELECT id, number, kind, ref_id, receipt_date, category, customer, description, amount, payment_method,
                       created_by, link, bike_id, status, cancelled_at, cancelled_by, created_at
                FROM {t} {clause} ORDER BY receipt_date DESC, created_at DESC, id DESC LIMIT %s OFFSET %s""",
            params + [size, (page - 1) * size],
        )
        cols = [x[0] for x in c.description]
        rows = [dict(zip(cols, r)) for r in c.fetchall()]

    for r in rows:
        r["amount"] = float(r["amount"] or 0)
        for k in ("receipt_date", "cancelled_at", "created_at"):
            v = r[k]
            r[k] = v.isoformat() if hasattr(v, "isoformat") else v
        r["kind_label"] = receipts.KIND_LABEL.get(r["kind"], r["kind"])
        if not reviewer:
            r.pop("cancelled_by", None)

    data = {"total": total, "page": page, "page_size": size, "results": rows}
    if str(getattr(request.user, "role", "") or "").lower() in ("adm", "admin", "administrator"):  # 🔒 ยอดรวม เฉพาะ adm
        data["amount_sum"] = float(Decimal(str(amount_sum or 0)))
    return Response(data)
