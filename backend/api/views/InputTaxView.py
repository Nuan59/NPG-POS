"""
✅ ใบกำกับภาษีซื้อ (นำเข้า) + สรุปภาษี
GET  /input-tax-invoices/?year=&month=     adm/ผู้ตรวจสอบ: ทุกใบ / พนักงาน: เฉพาะที่ตัวเองบันทึก (ราคาซื้อ = ต้นทุน)
POST /input-tax-invoices/                  พนักงาน / adm บันทึก { invoice_date, supplier_name, supplier_tax_id,
                                            supplier_branch?, invoice_no, description?, amount, vat_amount?,
                                            tax_year?, tax_month?, note? }
POST /input-tax-invoices/<id>/cancel/      (adm) { reason }
GET  /tax-summary/?year=&month=            (adm / ผู้ตรวจสอบ) ภาษีขาย - ภาษีซื้อ ของเดือน (month ว่าง = ทั้งปี)
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from rest_framework.decorators import api_view
from rest_framework.response import Response

from api import activity, input_tax, tax_invoices

REVIEW = ("adm", "admin", "administrator", "mon")


def _role(u):
    return str(getattr(u, "role", "") or "").lower()


def _name(u):
    return getattr(u, "name", "") or getattr(u, "username", "") or ""


def _period(request):
    try:
        year = int(request.query_params.get("year") or date.today().year)
        month = request.query_params.get("month")
        month = int(month) if month not in (None, "", "0", "all") else None
        if month is not None and not 1 <= month <= 12:
            raise ValueError
    except ValueError:
        return None, None, Response({"error": "เดือน/ปีไม่ถูกต้อง"}, status=400)
    return year, month, None


@api_view(["GET", "POST"])
def input_tax_list(request):
    if request.method == "POST":
        return _create(request)
    year, month, err = _period(request)
    if err:
        return err
    where, params = ["tax_year = %s"], [year]
    if month:
        where.append("tax_month = %s")
        params.append(month)
    reviewer = _role(request.user) in REVIEW
    if not reviewer:
        # 🔒 ราคาซื้อ = ต้นทุน → พนักงานเห็นเฉพาะใบที่ตัวเองบันทึก
        where.append("created_by_username = %s")
        params.append(getattr(request.user, "username", ""))
    rows = input_tax.select("WHERE " + " AND ".join(where), params)
    return Response({"invoices": rows, "can_cancel": activity.is_admin(request.user), "all": reviewer})


def _money(v, label):
    try:
        x = Decimal(str(v).replace(",", ""))
    except (InvalidOperation, TypeError):
        raise ValueError(f"{label}ไม่ถูกต้อง")
    return x


def _create(request):
    if _role(request.user) not in ("adm", "admin", "administrator", "emp"):
        return Response({"error": "ไม่มีสิทธิ์บันทึก"}, status=403)
    d = request.data
    try:
        inv_date = datetime.strptime(str(d.get("invoice_date") or ""), "%Y-%m-%d").date()
    except ValueError:
        return Response({"error": "กรุณาใส่วันที่ในใบกำกับ"}, status=400)
    if inv_date > date.today():
        return Response({"error": "วันที่ในใบต้องไม่เกินวันนี้"}, status=400)
    supplier = (d.get("supplier_name") or "").strip()
    invoice_no = (d.get("invoice_no") or "").strip()
    if not supplier:
        return Response({"error": "กรุณาใส่ชื่อผู้ขาย"}, status=400)
    if not invoice_no:
        return Response({"error": "กรุณาใส่เลขที่ใบกำกับ"}, status=400)
    tax_id = "".join(ch for ch in str(d.get("supplier_tax_id") or "") if ch.isdigit())
    if tax_id and len(tax_id) != 13:
        return Response({"error": "เลขประจำตัวผู้เสียภาษีของผู้ขายต้องเป็นตัวเลข 13 หลัก"}, status=400)
    try:
        amount = input_tax.q2(_money(d.get("amount"), "ยอดรวม"))
        if amount <= 0:
            raise ValueError("ยอดรวมต้องมากกว่า 0")
        vat_raw = d.get("vat_amount")
        # ✅ VAT ตามที่พิมพ์ในใบ (ถ้าไม่ใส่ ถอดจากยอดรวม 7/107)
        vat = input_tax.q2(_money(vat_raw, "VAT")) if vat_raw not in (None, "") else tax_invoices.split_vat(amount)[2]
        if vat < 0 or vat >= amount:
            raise ValueError("VAT ต้องไม่ติดลบ และน้อยกว่ายอดรวม")
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    try:
        ty = int(d.get("tax_year") or inv_date.year)
        tm = int(d.get("tax_month") or inv_date.month)
        if not 1 <= tm <= 12:
            raise ValueError
    except ValueError:
        return Response({"error": "เดือนภาษีไม่ถูกต้อง"}, status=400)
    if (ty, tm) < (inv_date.year, inv_date.month):
        return Response({"error": "เดือนภาษีต้องไม่ก่อนเดือนในใบกำกับ"}, status=400)

    dup = input_tax.duplicate(tax_id, invoice_no, supplier)
    if dup:
        return Response({"error": f"ใบนี้บันทึกไปแล้ว ({supplier} เลขที่ {invoice_no})"}, status=409)

    row = input_tax.insert({
        "invoice_date": inv_date, "tax_year": ty, "tax_month": tm, "supplier_name": supplier,
        "supplier_tax_id": tax_id, "supplier_branch": (d.get("supplier_branch") or "").strip(),
        "invoice_no": invoice_no, "description": (d.get("description") or "").strip(),
        "base_amount": amount - vat, "vat_amount": vat, "amount": amount,
        "note": (d.get("note") or "").strip(), "created_by": _name(request.user),
        "created_by_username": getattr(request.user, "username", "") or "",
    })
    activity.note(request, f"บันทึกใบกำกับภาษีซื้อ {supplier} เลขที่ {invoice_no} · ยอด {amount:,.2f} (VAT {vat:,.2f}) "
                           f"· เดือนภาษี {tm}/{ty + 543}")
    return Response(row, status=201)


@api_view(["POST"])
def input_tax_cancel(request, pk):
    if not activity.is_admin(request.user):
        return Response({"error": "ยกเลิกได้เฉพาะ adm"}, status=403)
    reason = (request.data.get("reason") or "").strip()
    if not reason:
        return Response({"error": "กรุณาใส่เหตุผลที่ยกเลิก"}, status=400)
    inv = input_tax.get(pk)
    if not inv:
        return Response({"error": "ไม่พบใบ"}, status=404)
    if not input_tax.cancel(pk, _name(request.user), reason):
        return Response({"error": "ใบนี้ยกเลิกไปแล้ว"}, status=400)
    activity.note(request, f"ยกเลิกใบกำกับภาษีซื้อ {inv['supplier_name']} เลขที่ {inv['invoice_no']} ({inv['amount']:,.2f}) · {reason}")
    return Response(input_tax.get(pk))


def _sum(rows):
    return {
        "count": len(rows),
        "base": round(sum(r["base_amount"] for r in rows), 2),
        "vat": round(sum(r["vat_amount"] for r in rows), 2),
        "total": round(sum(r["amount"] for r in rows), 2),
    }


@api_view(["GET"])
def tax_summary(request):
    """🔒 adm / ผู้ตรวจสอบ: ภาษีขาย (ใบกำกับที่ออก) - ภาษีซื้อ (ใบนำเข้า) ของเดือน/ปีที่เลือก"""
    if _role(request.user) not in REVIEW:
        return Response({"error": "เฉพาะ adm"}, status=403)
    year, month, err = _period(request)
    if err:
        return err
    if month:
        start = date(year, month, 1)
        end = date(year + (month == 12), (month % 12) + 1, 1)
        months = [month]
    else:
        start, end, months = date(year, 1, 1), date(year + 1, 1, 1), list(range(1, 13))
    sales = tax_invoices.list_all("WHERE status = 'active' AND issue_date >= %s AND issue_date < %s", [start, end], 5000)
    pw, pp = ["status = 'active'", "tax_year = %s"], [year]
    if month:
        pw.append("tax_month = %s")
        pp.append(month)
    purchases = input_tax.select("WHERE " + " AND ".join(pw), pp, 5000)

    by_month = []
    for m in months:
        s = [r for r in sales if int(str(r["issue_date"])[5:7]) == m]
        p = [r for r in purchases if int(r["tax_month"]) == m]
        sv, pv = round(sum(r["vat_amount"] for r in s), 2), round(sum(r["vat_amount"] for r in p), 2)
        by_month.append({"month": m, "sales_vat": sv, "purchase_vat": pv, "net": round(sv - pv, 2),
                         "sales_count": len(s), "purchase_count": len(p)})
    S, P = _sum(sales), _sum(purchases)
    return Response({
        "year": year, "month": month,
        "sales": {**S, "rows": sales},
        "purchases": {**P, "rows": purchases},
        "net_vat": round(S["vat"] - P["vat"], 2),  # > 0 = ต้องชำระ / < 0 = ภาษีซื้อมากกว่า (ยกไป/ขอคืน)
        "by_month": by_month,
    })
