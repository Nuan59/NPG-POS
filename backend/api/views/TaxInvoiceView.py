"""
✅ ใบกำกับภาษี
GET  /tax-invoices/?order=<id>        ใบของรายการขายนั้น (ใบล่าสุดก่อน รวมที่ยกเลิก) + ค่าตั้งต้นสำหรับออกใบ
GET  /tax-invoices/?q=&page=          (adm / ผู้ตรวจสอบ) ทุกใบ
GET  /tax-invoices/<id>/              ใบเดียว (พิมพ์ซ้ำ)
POST /tax-invoices/                   ออกใบ { order, amount, issue_date?, buyer_name, buyer_address, buyer_tax_id,
                                       buyer_branch?, buyer_phone?, item_description? }
POST /tax-invoices/<id>/cancel/       (adm) { reason }
สิทธิ์ออกใบ: adm เสมอ / พนักงาน = สิทธิ์ "ใบกำกับภาษี" (ยังไม่เคยตั้ง = ตามสิทธิ์ "ขาย") / ผู้ตรวจสอบ ดูอย่างเดียว
"""
from datetime import date, datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from api import activity, tax_invoices
from api.models import Order


def _role(user):
    return str(getattr(user, "role", "") or "").lower()


def can_issue(user):
    role = _role(user)
    if role in ("adm", "admin", "administrator"):
        return True
    if role != "emp":
        return False
    perms = getattr(user, "permissions", None) or {}
    v = perms.get("tax_invoice")
    return v if isinstance(v, bool) else bool(perms.get("sale"))


def _name(user):
    return getattr(user, "name", "") or getattr(user, "username", "") or ""


def _address(c):
    if not c:
        return ""
    parts = [c.address or ""]
    if c.subdistrict:
        parts.append(f"ต.{c.subdistrict}")
    if c.district:
        parts.append(f"อ.{c.district}")
    if c.province:
        parts.append(f"จ.{c.province}")
    if c.postal_code:
        parts.append(c.postal_code)
    return " ".join(p for p in parts if p).strip()


def _defaults(order):
    """ค่าตั้งต้น: ผู้ซื้อ = ลูกค้าของรายการขาย / ยอด = ราคารถหลังหักส่วนลด (รวม VAT แล้ว)"""
    c = order.customer
    bike = order.bikes.first()
    price = float(order.sale_price or 0) or float(getattr(bike, "sale_price", 0) or 0)
    amount = max(price - float(order.discount or 0), 0)
    desc = "รถจักรยานยนต์"
    if bike:
        desc += f" {bike.brand + ' ' if getattr(bike, 'brand', '') else ''}{bike.model_name}"
        if bike.model_code:
            desc += f" รุ่น {bike.model_code}"
        if getattr(bike, "color", ""):
            desc += f" สี{bike.color}"
        if getattr(bike, "chassi", ""):
            desc += f" เลขตัวถัง {bike.chassi}"
        if getattr(bike, "engine", ""):
            desc += f" เลขเครื่อง {bike.engine}"
    return {
        "amount": round(amount, 2),
        "buyer_name": c.name if c else "",
        "buyer_address": _address(c),
        "buyer_tax_id": (c.id_card_number or "") if c else "",
        "buyer_branch": "",
        "buyer_phone": (c.phone or "") if c else "",
        "item_description": desc[:500],
        "issue_date": date.today().isoformat(),
    }


@api_view(["GET", "POST"])
def tax_invoice_list(request):
    if request.method == "POST":
        return _issue(request)
    order_id = request.query_params.get("order")
    if order_id:
        try:
            order = Order.objects.select_related("customer").prefetch_related("bikes").get(pk=int(order_id))
        except (Order.DoesNotExist, ValueError):
            return Response({"error": "ไม่พบรายการขาย"}, status=404)
        return Response({
            "invoices": tax_invoices.list_for_order(order.id),
            "defaults": _defaults(order),
            "can_issue": can_issue(request.user),
            "can_cancel": activity.is_admin(request.user),
            "vat_rate": float(tax_invoices.VAT_RATE),
        })
    if _role(request.user) not in ("adm", "admin", "administrator", "mon"):
        return Response({"error": "ระบุรายการขาย (order)"}, status=400)
    q = (request.query_params.get("q") or "").strip().lower()
    where, params = "", []
    if q:
        where = "WHERE LOWER(number) LIKE %s OR LOWER(buyer_name) LIKE %s"
        params = [f"%{q}%", f"%{q}%"]
    return Response({"invoices": tax_invoices.list_all(where, params)})


def _issue(request):
    if not can_issue(request.user):
        return Response({"error": "ไม่มีสิทธิ์ออกใบกำกับภาษี (ให้ adm เปิดสิทธิ์ที่หน้าพนักงาน)"}, status=403)
    d = request.data
    try:
        order = Order.objects.select_related("customer").prefetch_related("bikes").get(pk=int(d.get("order")))
    except (Order.DoesNotExist, TypeError, ValueError):
        return Response({"error": "ไม่พบรายการขาย"}, status=404)
    if order.transaction_type != "ขาย":
        return Response({"error": "ออกใบกำกับภาษีได้เฉพาะรายการขาย"}, status=400)
    existing = tax_invoices.active_for_order(order.id)
    if existing:
        return Response({"error": f"รายการนี้ออกใบกำกับภาษีแล้ว ({existing['number']}) - ต้องให้ adm ยกเลิกใบเดิมก่อน",
                         "invoice": existing}, status=409)

    base = _defaults(order)
    try:
        amount = round(float(d.get("amount", base["amount"])), 2)
    except (TypeError, ValueError):
        return Response({"error": "ยอดเงินไม่ถูกต้อง"}, status=400)
    if amount <= 0:
        return Response({"error": "ยอดเงินต้องมากกว่า 0"}, status=400)
    try:
        issue_date = datetime.strptime(str(d.get("issue_date") or base["issue_date"]), "%Y-%m-%d").date()
    except ValueError:
        return Response({"error": "วันที่ไม่ถูกต้อง"}, status=400)
    if issue_date > date.today():
        return Response({"error": "วันที่ออกใบต้องไม่เกินวันนี้"}, status=400)

    def val(k):
        v = d.get(k)
        return (base[k] if v is None else str(v)).strip()

    data = {k: val(k) for k in ("buyer_name", "buyer_address", "buyer_tax_id", "buyer_branch", "buyer_phone", "item_description")}
    if not data["buyer_name"]:
        return Response({"error": "กรุณาใส่ชื่อผู้ซื้อ (ผู้รับใบกำกับภาษี)"}, status=400)
    if not data["buyer_address"]:
        return Response({"error": "กรุณาใส่ที่อยู่ผู้ซื้อ"}, status=400)
    tax_id = data["buyer_tax_id"].replace("-", "").replace(" ", "")
    if tax_id and (not tax_id.isdigit() or len(tax_id) != 13):
        return Response({"error": "เลขประจำตัวผู้เสียภาษีของผู้ซื้อต้องเป็นตัวเลข 13 หลัก"}, status=400)
    data["buyer_tax_id"] = tax_id
    data.update(amount=amount, issue_date=issue_date, issued_by=_name(request.user),
                issued_by_username=getattr(request.user, "username", "") or "")

    inv = tax_invoices.issue(order.id, data)
    activity.note(request, f"ออกใบกำกับภาษี {inv['number']} · O-{order.id:08d} · {inv['buyer_name']} · "
                           f"ยอด {amount:,.2f} (มูลค่า {inv['base_amount']:,.2f} + VAT {inv['vat_amount']:,.2f})")
    return Response(inv, status=201)


@api_view(["GET"])
def tax_invoice_detail(request, pk):
    inv = tax_invoices.get(pk)
    if not inv:
        return Response({"error": "ไม่พบใบกำกับภาษี"}, status=404)
    return Response(inv)


@api_view(["POST"])
def tax_invoice_cancel(request, pk):
    if not activity.is_admin(request.user):
        return Response({"error": "ยกเลิกใบกำกับภาษีได้เฉพาะ adm"}, status=403)
    reason = (request.data.get("reason") or "").strip()
    if not reason:
        return Response({"error": "กรุณาใส่เหตุผลที่ยกเลิก"}, status=400)
    inv = tax_invoices.get(pk)
    if not inv:
        return Response({"error": "ไม่พบใบกำกับภาษี"}, status=404)
    if not tax_invoices.cancel(pk, _name(request.user), reason):
        return Response({"error": "ใบนี้ยกเลิกไปแล้ว"}, status=400)
    activity.note(request, f"ยกเลิกใบกำกับภาษี {inv['number']} ({inv['buyer_name']} {inv['amount']:,.2f}) · เหตุผล: {reason}")
    return Response(tax_invoices.get(pk))
