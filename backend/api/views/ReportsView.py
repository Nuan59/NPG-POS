from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models.functions import ExtractMonth, ExtractYear
from django.db.models import Count, F, Q

from api.models import Order, Bike
from api.models.Cashflow import CashflowEntry


def _sold_orders():
    """✅ เฉพาะงานขายที่ "จบรายการ" (ตัดขาย) แล้ว - รายการที่ยังรอจบไม่นับในรายงาน"""
    return Order.objects.filter(sale_status='completed')


# =========================
# THAI MONTH MAPPING
# =========================
THAI_MONTHS = {
    1: "มกราคม",
    2: "กุมภาพันธ์",
    3: "มีนาคม",
    4: "เมษายน",
    5: "พฤษภาคม",
    6: "มิถุนายน",
    7: "กรกฎาคม",
    8: "สิงหาคม",
    9: "กันยายน",
    10: "ตุลาคม",
    11: "พฤศจิกายน",
    12: "ธันวาคม",
}


# =========================
# PRICE DECODER
# =========================
CODE_MAP = {
    'N': '1',
    'C': '2',
    'I': '3',
    'O': '4',
    'W': '5',
    'M': '6',
    'A': '7',
    'E': '8',
    'Z': '9',
    'T': '0',
}

def decode_price(encoded):
    if not encoded or not isinstance(encoded, str):
        return 0
    
    upper = encoded.strip().upper()
    decoded = ''
    
    for char in upper:
        if char in CODE_MAP:
            decoded += CODE_MAP[char]
        else:
            return 0
    
    try:
        return int(decoded)
    except:
        return 0


def parse_price_value(value):
    """
    ✅ แปลงค่า wholesale_price ให้เป็นตัวเลขอย่างปลอดภัย
    รองรับทั้งตัวเลขปกติ ("12500") และรหัสตัวอักษร ("NCIOW...") ที่ต้อง decode
    ใช้ร่วมกันทั้งกับ Bike และ Gift item เพื่อกันปัญหา field รูปแบบไม่ตรงกัน
    (เดิม get_gift_cost ไม่ได้ decode ทำให้ float() พังถ้าเจอค่าที่เป็นรหัสตัวอักษร -> 500)
    """
    if not value:
        return 0

    text = str(value).strip()
    if not text:
        return 0

    if text.replace('.', '').replace('-', '').isdigit():
        try:
            return float(text)
        except (ValueError, TypeError):
            return 0
    else:
        return decode_price(text)


def get_bike_cost(bike):
    return parse_price_value(bike.wholesale_price)


def get_gift_cost(order):
    """
    ✅ คำนวณต้นทุนของแถมจาก OrderGift
    - ดึง wholesale_price จาก Gift model (รองรับทั้งเลขปกติและรหัสตัวอักษรแบบเดียวกับ Bike)
    - คูณด้วย quantity
    - นี่คือ "ต้นทุน" จริงที่ร้านเสียไป (ของที่แจกฟรี) ต้องหักออกจากกำไร
    ✅ กัน crash ต่อ order_gift ที่ผิดปกติ (field หาย/รูปแบบแปลก) ไม่ให้ล้ม request ทั้งชุด
    """
    total_gift_cost = 0
    for order_gift in order.gifts.select_related('item').all():
        try:
            if order_gift.item and order_gift.item.wholesale_price:
                price = parse_price_value(order_gift.item.wholesale_price)
                qty = int(order_gift.quantity or 0)
                total_gift_cost += price * qty
        except Exception as e:
            print(f"⚠️ get_gift_cost error on order_gift id={getattr(order_gift, 'id', '?')}: {e}")
            continue
    return total_gift_cost


def get_additional_fee_revenue(order):
    """
    ✅ ค่าใช้จ่ายเพิ่มเติมที่ "เก็บจากลูกค้า" (เช่น ค่าทะเบียน, ค่าโอน, หักเงินให้บุคคลที่ 3)
    เงินก้อนนี้ลูกค้าเป็นคนจ่ายเข้ามา = รายได้เพิ่มเติมของร้าน ไม่ใช่ต้นทุน
    (เดิมโค้ดเอาไปรวมกับต้นทุนของแถมแล้วหักออกจากกำไรผิดจุด)
    """
    total = 0
    for fee in order.additional_fees.all():
        total += float(fee.amount or 0)
    return total


def get_cashflow_expenses_by_month():
    """
    ✅ ดึงยอด "รายจ่าย" จากระบบรายรับ-รายจ่ายประจำวัน (CashflowEntry.expense) รวมเป็นรายเดือน
    เอาเฉพาะคอลัมน์ expense เท่านั้น - ไม่รวม รายรับ/ส่งเงิน/ทอนเงิน/คืนมัดจำ ตามที่ระบุ
    คืนค่าเป็น dict {"2026-สิงหาคม": 12345.0, ...}
    ✅ ห่อการ query ทั้งก้อนด้วย try/except ด้วย - ถ้า query ล้มเหลวทั้งชุด
    (เช่น table ยังไม่ migrate / DB error) จะไม่ทำให้ financial_summary/overview ทั้ง endpoint 500
    """
    result = {}
    try:
        entries = list(CashflowEntry.objects.all())
    except Exception as e:
        print(f"⚠️ get_cashflow_expenses_by_month: query ทั้งก้อนล้มเหลว: {e}")
        return result

    for entry in entries:
        if not entry.date:
            continue
        try:
            year = entry.date.year
            month_name = THAI_MONTHS.get(entry.date.month)
            key = f"{year}-{month_name}"
            result[key] = result.get(key, 0) + float(entry.expense or 0)
        except Exception as e:
            print(f"⚠️ get_cashflow_expenses_by_month error on entry id={getattr(entry, 'id', '?')}: {e}")
            continue
    return result


def get_total_cashflow_expense():
    """
    ✅ ยอดรวมรายจ่ายทั้งหมดจากระบบรายรับ-รายจ่าย (สำหรับภาพรวมทั้งหมด ไม่แยกเดือน)
    ห่อการ query ทั้งก้อนด้วย try/except เช่นกัน
    """
    total = 0
    try:
        entries = list(CashflowEntry.objects.all())
    except Exception as e:
        print(f"⚠️ get_total_cashflow_expense: query ทั้งก้อนล้มเหลว: {e}")
        return total

    for entry in entries:
        try:
            total += float(entry.expense or 0)
        except Exception as e:
            print(f"⚠️ get_total_cashflow_expense error on entry id={getattr(entry, 'id', '?')}: {e}")
            continue
    return total


# ============================================================
# SALES REPORTS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_volume(request):
    qs = (
        _sold_orders()
        .annotate(
            year=ExtractYear("sale_date"),
            month=ExtractMonth("sale_date"),
        )
        .values("year", "month")
        .annotate(total_sales=Count("id"))
        .order_by("year", "month")
    )

    data = []
    for row in qs:
        data.append({
            "year": row["year"],
            "month": THAI_MONTHS.get(row["month"]),
            "total_sales": row["total_sales"],
        })

    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_by_condition(request):
    result_map = {}
    
    for order in _sold_orders():
        if not order.sale_date:
            continue
        
        year = order.sale_date.year
        month_name = THAI_MONTHS.get(order.sale_date.month)
        key = f"{year}-{month_name}"
        
        if key not in result_map:
            result_map[key] = {
                "year": year,
                "month": month_name,
                "new": 0,
                "pre_owned": 0
            }
        
        result_map[key]["new"] += order.bikes.filter(category="new").count()
        result_map[key]["pre_owned"] += order.bikes.filter(category="pre_owned").count()
    
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_payment_method(request):
    qs = (
        _sold_orders().values("payment_method")
        .annotate(total_sales=Count("id"))
        .order_by("-total_sales")
    )

    return Response({"data": list(qs)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vehicle_type_total(request):
    new_count = 0
    pre_owned_count = 0
    
    for order in _sold_orders():
        new_count += order.bikes.filter(category="new").count()
        pre_owned_count += order.bikes.filter(category="pre_owned").count()
    
    return Response({
        "data": {
            "new": new_count,
            "pre_owned": pre_owned_count
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_by_model(request):
    result_map = {}
    
    for order in _sold_orders():
        if not order.sale_date:
            continue
        
        year = order.sale_date.year
        month_name = THAI_MONTHS.get(order.sale_date.month)
        
        for bike in order.bikes.all():
            model_name = bike.model_name or "ไม่ระบุ"
            key = f"{year}-{month_name}-{model_name}"
            
            if key not in result_map:
                result_map[key] = {
                    "year": year,
                    "month": month_name,
                    "model_name": model_name,
                    "total": 0
                }
            
            result_map[key]["total"] += 1
    
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


# ============================================================
# INVENTORY REPORTS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_volume(request):
    qs = (
        Bike.objects.all()
        .annotate(
            year=ExtractYear("received_date"),
            month=ExtractMonth("received_date"),
        )
        .values("year", "month")
        .annotate(total_bikes=Count("id"))
        .order_by("year", "month")
    )

    data = []
    for row in qs:
        data.append({
            "year": row["year"],
            "month": THAI_MONTHS.get(row["month"]),
            "total_bikes": row["total_bikes"],
        })

    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_models(request):
    qs = (
        Bike.objects.filter(sold=False)
        .values("model_name")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    return Response({"data": list(qs)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_storages(request):
    qs = (
        Bike.objects.filter(sold=False)
        .values(storage_name=F("storage_place__storage_name"))
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    return Response({"data": list(qs)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_brands(request):
    qs = (
        Bike.objects.filter(sold=False)
        .values("brand")
        .annotate(total=Count("id"))
    )

    return Response({"data": list(qs)})


# ============================================================
# FINANCIAL REPORTS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financial_summary(request):
    """
    📊 สรุปการเงินรายเดือน
    - ต้นทุน (จาก wholesale_price ของ bike)
    - รายได้ (จาก sale_price)
    - ค่าใช้จ่ายเพิ่มเติม (AdditionalFee + ต้นทุนของแถม)
    - กำไรสุทธิ
    """
    try:
        return _financial_summary_impl(request)
    except Exception as e:
        import traceback
        print(f"❌ financial_summary FATAL: {e}")
        traceback.print_exc()
        return Response({"error": f"{type(e).__name__}: {e}"}, status=500)


def _financial_summary_impl(request):
    result_map = {}
    
    for order in _sold_orders().select_related('customer').prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
        if not order.sale_date:
            continue

        try:
            year = order.sale_date.year
            month_name = THAI_MONTHS.get(order.sale_date.month)
            key = f"{year}-{month_name}"

            if key not in result_map:
                result_map[key] = {
                    "year": year,
                    "month": month_name,
                    "revenue": 0,
                    "additional_fee_revenue": 0,  # ✅ ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า (แยกโชว์ต่างหาก)
                    "cost": 0,
                    "additional_fees": 0,
                    "cashflow_expense": 0,  # ✅ รายจ่ายจากระบบรายรับ-รายจ่าย (เติมทีหลัง)
                    "gross_profit": 0,
                    "net_profit": 0,
                    "order_count": 0,
                }

            # ✅ รายได้ = ราคาสินค้า + ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า (เช่น ค่าทะเบียน, ค่าโอน)
            order_additional_fee_revenue = get_additional_fee_revenue(order)
            revenue = float(order.sale_price or 0) + order_additional_fee_revenue
            result_map[key]["revenue"] += revenue
            result_map[key]["additional_fee_revenue"] += order_additional_fee_revenue

            # ต้นทุนรถ
            cost = 0
            for bike in order.bikes.all():
                cost += get_bike_cost(bike)
            result_map[key]["cost"] += cost

            # ✅ ต้นทุนของแถม (เฉพาะของที่ร้านแจกฟรีจริงๆ - คนละก้อนกับค่าใช้จ่ายที่เก็บจากลูกค้าข้างบน)
            result_map[key]["additional_fees"] += get_gift_cost(order)
            result_map[key]["order_count"] += 1
        except Exception as e:
            # ✅ กัน order แปลกๆ ตัวเดียวทำให้ทั้ง endpoint 500 - log แล้วข้ามไปตัวถัดไป
            print(f"⚠️ financial_summary error on order id={getattr(order, 'id', '?')}: {e}")
            continue
    
    # ⏸️ ปิดการดึงยอดรายจ่ายจากระบบรายรับ-รายจ่ายไว้ก่อนชั่วคราว
    # (ตาราง cashflow_entry ยังไม่ถูกสร้างจริงในฐานข้อมูล production - รอ migrate)
    # เมื่อพร้อม migrate แล้วค่อยเปิดกลับมาใช้: cashflow_expenses_by_month = get_cashflow_expenses_by_month()
    cashflow_expenses_by_month = {}
    for key, expense_amount in cashflow_expenses_by_month.items():
        if key not in result_map:
            year_str, month_name = key.split("-", 1)
            result_map[key] = {
                "year": int(year_str),
                "month": month_name,
                "revenue": 0,
                "additional_fee_revenue": 0,
                "cost": 0,
                "additional_fees": 0,
                "cashflow_expense": 0,
                "gross_profit": 0,
                "net_profit": 0,
                "order_count": 0,
            }
        result_map[key]["cashflow_expense"] += expense_amount
    
    # คำนวณกำไร
    for key in result_map:
        data = result_map[key]
        data["gross_profit"] = data["revenue"] - data["cost"]
        # ✅ กำไรสุทธิหักทั้งต้นทุนของแถม และรายจ่ายจากระบบรายรับ-รายจ่ายด้วย
        data["net_profit"] = data["gross_profit"] - data["additional_fees"] - data["cashflow_expense"]
    
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financial_by_model(request):
    """
    📊 สรุปการเงินแยกตามรุ่นรถ
    ✅ รองรับ query param:
       - year  : ปี ค.ศ. เช่น 2026 (ไม่ส่ง = ทุกปี)
       - month : ชื่อเดือนไทย เช่น "มกราคม" (ไม่ส่ง = ทุกเดือน)
    """
    try:
        return _financial_by_model_impl(request)
    except Exception as e:
        import traceback
        print(f"❌ financial_by_model FATAL: {e}")
        traceback.print_exc()
        return Response({"error": f"{type(e).__name__}: {e}"}, status=500)


def _financial_by_model_impl(request):
    year_param = request.query_params.get('year')
    month_param = request.query_params.get('month')

    result_map = {}
    
    for order in _sold_orders().select_related('customer').prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
        if not order.sale_date:
            continue

        # ✅ กรองตามปี/เดือนที่ระบุมา (ถ้ามี)
        if year_param and str(order.sale_date.year) != str(year_param):
            continue
        if month_param and month_param != 'all':
            if THAI_MONTHS.get(order.sale_date.month) != month_param:
                continue
        
        # ✅ รายได้รวมค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า หารเฉลี่ยตามจำนวนรถในออเดอร์เดียวกัน
        order_additional_fee_revenue = get_additional_fee_revenue(order)
        order_total_revenue = float(order.sale_price or 0) + order_additional_fee_revenue

        for bike in order.bikes.all():
            model_name = bike.model_name or "ไม่ระบุ"
            
            if model_name not in result_map:
                result_map[model_name] = {
                    "model_name": model_name,
                    "revenue": 0,
                    "cost": 0,
                    "gross_profit": 0,
                    "count": 0,
                }
            
            bike_count = order.bikes.count()
            revenue_per_bike = order_total_revenue / bike_count if bike_count > 0 else 0
            
            result_map[model_name]["revenue"] += revenue_per_bike
            result_map[model_name]["cost"] += get_bike_cost(bike)
            result_map[model_name]["count"] += 1
    
    # คำนวณกำไร
    for model in result_map:
        data = result_map[model]
        data["gross_profit"] = data["revenue"] - data["cost"]
    
    data = list(result_map.values())
    data.sort(key=lambda x: x["gross_profit"], reverse=True)
    
    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financial_overview(request):
    """
    📊 ภาพรวมการเงินทั้งหมด
    """
    try:
        return _financial_overview_impl(request)
    except Exception as e:
        import traceback
        print(f"❌ financial_overview FATAL: {e}")
        traceback.print_exc()
        return Response({"error": f"{type(e).__name__}: {e}"}, status=500)


def _financial_overview_impl(request):
    total_revenue = 0
    total_additional_fee_revenue = 0  # ✅ ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า (แยกโชว์ต่างหาก)
    total_cost = 0
    total_additional_fees = 0
    total_orders = 0
    
    for order in _sold_orders().prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
        try:
            # ✅ รายได้ = ราคาสินค้า + ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า
            order_additional_fee_revenue = get_additional_fee_revenue(order)
            total_revenue += float(order.sale_price or 0) + order_additional_fee_revenue
            total_additional_fee_revenue += order_additional_fee_revenue

            for bike in order.bikes.all():
                total_cost += get_bike_cost(bike)

            # ✅ ต้นทุนของแถม (เฉพาะของแจกฟรีจริง ไม่รวมค่าใช้จ่ายที่เก็บจากลูกค้าแล้ว)
            total_additional_fees += get_gift_cost(order)

            total_orders += 1
        except Exception as e:
            # ✅ กัน order แปลกๆ ตัวเดียวทำให้ทั้ง endpoint 500 - log แล้วข้ามไปตัวถัดไป
            print(f"⚠️ financial_overview error on order id={getattr(order, 'id', '?')}: {e}")
            continue
    
    gross_profit = total_revenue - total_cost
    # ⏸️ ปิดการดึงยอดรายจ่ายจากระบบรายรับ-รายจ่ายไว้ก่อนชั่วคราว
    # (ตาราง cashflow_entry ยังไม่ถูกสร้างจริงในฐานข้อมูล production - รอ migrate)
    # เมื่อพร้อม migrate แล้วค่อยเปิดกลับมาใช้: total_cashflow_expense = get_total_cashflow_expense()
    total_cashflow_expense = 0
    net_profit = gross_profit - total_additional_fees - total_cashflow_expense
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return Response({
        "data": {
            "total_revenue": total_revenue,
            "total_additional_fee_revenue": total_additional_fee_revenue,
            "total_cost": total_cost,
            "total_additional_fees": total_additional_fees,
            "total_cashflow_expense": total_cashflow_expense,
            "gross_profit": gross_profit,
            "net_profit": net_profit,
            "profit_margin": round(profit_margin, 2),
            "total_orders": total_orders,
            "average_profit_per_order": round(net_profit / total_orders, 2) if total_orders > 0 else 0,
        }
    })

# =========================
# รายงานพนักงาน (adm เท่านั้น)
# =========================
# GET /reports/employees/?start=YYYY-MM-DD&end=YYYY-MM-DD
# รวมทุกอย่างที่เกี่ยวกับการทำงานของพนักงานแต่ละคนในช่วงวันที่ (ตามเวลาไทย)
# ขาย / บริการ / งานที่มอบหมาย / เช็คอิน / note ปิดร้าน / เข้า-ออกระบบ / ส่งเงินสด / ปัญหา / เบิกค่าใช้จ่าย
# แต่ละส่วนครอบ try ไว้ - ตารางไหนยังไม่ได้สร้าง ส่วนนั้นว่าง แต่รายงานส่วนอื่นยังใช้ได้ (แจ้งใน warnings)
def _bkk_range(start, end):
    from datetime import datetime, time, timedelta
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Asia/Bangkok")
    return (
        datetime.combine(start, time.min, tzinfo=tz),
        datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz),
    )


def _bkk(dt):
    from zoneinfo import ZoneInfo
    return dt.astimezone(ZoneInfo("Asia/Bangkok")) if dt else None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def employee_report(request):
    from datetime import date as _date
    from collections import defaultdict
    from django.utils import timezone
    from api.models import User, ServiceRecord, Issue
    from api.models.WorkHours import LoginLog
    from api.models.TaskPost import TaskAssignment, TaskCheckin, DailyNote
    from api.models.CashHandover import CashHandover
    from api.models.ExpenseRequest import ExpenseRequest

    if str(getattr(request.user, "role", "") or "").lower() != "adm":
        return Response({"error": "เฉพาะ adm"}, status=403)

    try:
        start = _date.fromisoformat(request.query_params.get("start", ""))
        end = _date.fromisoformat(request.query_params.get("end", ""))
    except ValueError:
        return Response({"error": "ต้องส่ง start และ end เป็น YYYY-MM-DD"}, status=400)
    if end < start:
        start, end = end, start
    dt_start, dt_end = _bkk_range(start, end)
    now = timezone.now()

    warnings = []
    users = {u.id: u for u in User.objects.all()}
    by_username = {u.username: u.id for u in users.values()}
    active_ids = set()  # คนที่มีความเคลื่อนไหวในช่วงนี้ (นอกจากพนักงาน emp ที่ยังใช้งานอยู่)

    def blank():
        return {
            "sales": {"orders": 0, "bikes": 0, "amount": 0.0, "pending": 0, "checklist_incomplete": 0},
            "services": {"count": 0, "amount": 0.0, "by_type": {}},
            "tasks": {"total": 0, "done": 0, "on_time": 0, "late_done": 0, "overdue_open": 0,
                      "in_progress": 0, "issue": 0, "pending": 0, "progress_avg_pct": None},
            "open_tasks": [],
            "checkin_days": 0,
            "notes": [], "note_days": 0, "note_complete_days": 0,
            "login": {"days": 0, "sessions": 0, "no_logout": 0, "avg_first_login": None},
            "login_days": [],
            "cash": {"handovers": 0, "sent_total": 0.0, "received": 0, "mismatch": 0, "pending": 0,
                     "diff_total": 0.0, "unsent_count": 0, "unsent_amount": 0.0},
            "issues": {"reported": 0, "assigned": 0, "resolved": 0, "open_assigned": 0, "avg_resolve_hours": None},
            "expenses": {"count": 0, "approved": 0, "approved_amount": 0.0, "rejected": 0, "pending": 0},
        }

    data = defaultdict(blank)

    # ---------- 1) ขาย ----------
    try:
        from api.views.OrderViewSet import CHECKLIST_KEYS
        from django.db import connection
        checklist_counts = {}
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT order_id, COUNT(*) FILTER (WHERE item_key = ANY(%s)) FROM sale_checklist GROUP BY order_id",
                    [list(CHECKLIST_KEYS)],
                )
                checklist_counts = {r[0]: r[1] for r in cursor.fetchall()}
        except Exception:
            pass

        sold = (_sold_orders().filter(transaction_type="ขาย", sale_date__gte=start, sale_date__lte=end, seller__isnull=False)
                .annotate(bike_count=Count("bikes")))
        for o in sold:
            s = data[o.seller_id]["sales"]
            s["orders"] += 1
            s["bikes"] += o.bike_count
            s["amount"] += float(o.sale_price or 0)
            if o.id in checklist_counts and len(CHECKLIST_KEYS) - checklist_counts[o.id] > 0:
                s["checklist_incomplete"] += 1
            active_ids.add(o.seller_id)

        pending = Order.objects.filter(transaction_type="ขาย", seller__isnull=False, created_at__gte=dt_start,
                                       created_at__lt=dt_end).exclude(sale_status="completed")
        for o in pending.only("id", "seller_id"):
            data[o.seller_id]["sales"]["pending"] += 1
            active_ids.add(o.seller_id)
    except Exception as e:
        warnings.append(f"ขาย: {e}")

    # ---------- 2) งานบริการ (ผูกด้วย username ใน created_by) ----------
    try:
        for r in ServiceRecord.objects.filter(service_date__gte=start, service_date__lte=end).only(
                "created_by", "total", "transaction_type"):
            uid = by_username.get(r.created_by)
            if not uid:
                continue
            s = data[uid]["services"]
            s["count"] += 1
            s["amount"] += float(r.total or 0)
            s["by_type"][r.transaction_type] = s["by_type"].get(r.transaction_type, 0) + 1
            active_ids.add(uid)
    except Exception as e:
        warnings.append(f"งานบริการ: {e}")

    # ---------- 3) งานที่มอบหมาย ----------
    # นับงานที่ "อยู่ในมือ" ช่วงนี้: โพสต์ก่อนสิ้นช่วง และ (ยังไม่เสร็จ หรือ เสร็จในช่วงนี้)
    try:
        progress = defaultdict(list)
        qs = (TaskAssignment.objects.select_related("post")
              .filter(post__post_type="assigned", post__created_at__lt=dt_end)
              .filter(~Q(status="done") | Q(completed_at__gte=dt_start)))
        for a in qs:
            t = data[a.employee_id]["tasks"]
            t["total"] += 1
            is_done = a.status == "done"
            overdue = bool(a.due_date and not is_done and a.due_date < now)
            if is_done:
                t["done"] += 1
                if a.due_date and a.completed_at and a.completed_at > a.due_date:
                    t["late_done"] += 1
                else:
                    t["on_time"] += 1
            else:
                t[a.status if a.status in ("in_progress", "issue", "pending") else "pending"] += 1
                if overdue:
                    t["overdue_open"] += 1
                data[a.employee_id]["open_tasks"].append({
                    "content": (a.post.content or "")[:200],
                    "status": a.status,
                    "due_date": a.due_date,
                    "overdue": overdue,
                    "target_quantity": a.target_quantity,
                    "current_progress": a.current_progress,
                    "target_unit": a.target_unit,
                    "note": a.note,
                })
            if a.target_quantity:
                progress[a.employee_id].append(min(a.current_progress / a.target_quantity, 1))
            active_ids.add(a.employee_id)
        for uid, vals in progress.items():
            data[uid]["tasks"]["progress_avg_pct"] = round(sum(vals) / len(vals) * 100)
        for d in data.values():
            d["open_tasks"].sort(key=lambda x: (not x["overdue"], x["due_date"] is None, x["due_date"] or now))
    except Exception as e:
        warnings.append(f"งานที่มอบหมาย: {e}")

    # ---------- 4) เช็คอิน + note ปิดร้าน ----------
    try:
        for c in TaskCheckin.objects.filter(date__gte=start, date__lte=end).only("user_id"):
            data[c.user_id]["checkin_days"] += 1
            active_ids.add(c.user_id)
    except Exception as e:
        warnings.append(f"เช็คอิน: {e}")
    try:
        from api.views.TaskViewSet import DAILY_NOTE_CHECKLIST
        keys = [k for k, _ in DAILY_NOTE_CHECKLIST]
        for n in DailyNote.objects.filter(date__gte=start, date__lte=end).order_by("-date"):
            d = data[n.user_id]
            ok = all((n.checklist or {}).get(k) for k in keys)
            d["note_days"] += 1
            d["note_complete_days"] += 1 if ok else 0
            d["notes"].append({"date": n.date, "today": n.today, "issue": n.issue,
                               "tomorrow": n.tomorrow, "checklist_ok": ok})
            active_ids.add(n.user_id)
    except Exception as e:
        warnings.append(f"note ปิดร้าน: {e}")

    # ---------- 5) เข้า-ออกระบบ ----------
    try:
        days = defaultdict(dict)  # uid -> {date: {...}}
        for log in LoginLog.objects.filter(login_at__gte=dt_start, login_at__lt=dt_end).order_by("login_at"):
            li, lo = _bkk(log.login_at), _bkk(log.logout_at)
            day = days[log.user_id].setdefault(li.date(), {"first_in": li, "last_out": None, "sessions": 0, "no_logout": 0})
            day["sessions"] += 1
            if lo:
                if not day["last_out"] or lo > day["last_out"]:
                    day["last_out"] = lo
            else:
                day["no_logout"] += 1
            # ไม่นับเป็นความเคลื่อนไหว - adm ล็อกอินเฉยๆ ไม่ต้องโผล่ในรายงาน
        for uid, per_day in days.items():
            lg = data[uid]["login"]
            lg["days"] = len(per_day)
            lg["sessions"] = sum(v["sessions"] for v in per_day.values())
            lg["no_logout"] = sum(v["no_logout"] for v in per_day.values())
            mins = [v["first_in"].hour * 60 + v["first_in"].minute for v in per_day.values()]
            avg = round(sum(mins) / len(mins))
            lg["avg_first_login"] = f"{avg // 60:02d}:{avg % 60:02d}"
            data[uid]["login_days"] = [
                {"date": dte, "first_in": v["first_in"].strftime("%H:%M"),
                 "last_out": v["last_out"].strftime("%H:%M") if v["last_out"] else None,
                 "sessions": v["sessions"], "no_logout": v["no_logout"]}
                for dte, v in sorted(per_day.items(), reverse=True)
            ]
    except Exception:
        warnings.append("เข้า-ออกระบบ: ยังไม่ได้สร้างตาราง (เปิด /dev/create-login-log-table/)")

    # ---------- 6) ส่งเงินสด ----------
    try:
        for h in CashHandover.objects.filter(created_at__gte=dt_start, created_at__lt=dt_end):
            uid = by_username.get(h.created_by_username)
            if not uid:
                continue
            c = data[uid]["cash"]
            c["handovers"] += 1
            c["sent_total"] += float(h.total or 0)
            if h.status == "pending":
                c["pending"] += 1
            else:
                c["received"] += 1
            if h.status == "mismatch":
                c["mismatch"] += 1
                c["diff_total"] += float((h.received_amount or 0) - (h.total or 0))
            active_ids.add(uid)
        # เงินค้างส่ง = สถานะ ณ ตอนนี้ (ไม่ขึ้นกับช่วงวันที่)
        from api.views.CashHandoverViewSet import _collect_unsent
        for r in _collect_unsent(None):
            uid = by_username.get(r["username"])
            if not uid:
                continue
            c = data[uid]["cash"]
            c["unsent_count"] += 1
            c["unsent_amount"] += float(r["amount"])
            active_ids.add(uid)
    except Exception as e:
        warnings.append(f"ส่งเงินสด: {e}")

    # ---------- 7) ปัญหา (Issue) ----------
    try:
        in_range = Issue.objects.filter(created_at__gte=dt_start, created_at__lt=dt_end)
        for i in in_range.only("created_by_id", "assigned_to_id"):
            if i.created_by_id:
                data[i.created_by_id]["issues"]["reported"] += 1
                active_ids.add(i.created_by_id)
            if i.assigned_to_id:
                data[i.assigned_to_id]["issues"]["assigned"] += 1
                active_ids.add(i.assigned_to_id)
        hours = defaultdict(list)
        for i in Issue.objects.filter(resolved_by__isnull=False, resolved_at__gte=dt_start, resolved_at__lt=dt_end):
            data[i.resolved_by_id]["issues"]["resolved"] += 1
            if i.created_at and i.resolved_at:
                hours[i.resolved_by_id].append((i.resolved_at - i.created_at).total_seconds() / 3600)
            active_ids.add(i.resolved_by_id)
        for uid, hs in hours.items():
            data[uid]["issues"]["avg_resolve_hours"] = round(sum(hs) / len(hs), 1)
        # งานปัญหาที่ค้างอยู่ในมือตอนนี้
        for i in Issue.objects.filter(assigned_to__isnull=False, status__in=["open", "in_progress"]).only("assigned_to_id"):
            data[i.assigned_to_id]["issues"]["open_assigned"] += 1
    except Exception as e:
        warnings.append(f"ปัญหา: {e}")

    # ---------- 8) เบิกค่าใช้จ่าย ----------
    try:
        for x in ExpenseRequest.objects.filter(created_at__gte=dt_start, created_at__lt=dt_end).only(
                "created_by_username", "status", "amount"):
            uid = by_username.get(x.created_by_username)
            if not uid:
                continue
            e_ = data[uid]["expenses"]
            e_["count"] += 1
            if x.status == "approved":
                e_["approved"] += 1
                e_["approved_amount"] += float(x.amount or 0)
            elif x.status == "rejected":
                e_["rejected"] += 1
            else:
                e_["pending"] += 1
            active_ids.add(uid)
    except Exception as e:
        warnings.append(f"เบิกค่าใช้จ่าย: {e}")

    # ---------- รวมผล: พนักงาน emp ที่ใช้งานอยู่ทุกคน + คนอื่นที่มีความเคลื่อนไหว ----------
    ids = {u.id for u in users.values() if u.role == "emp" and u.is_active} | (active_ids & set(users))
    employees = []
    for uid in ids:
        u = users[uid]
        employees.append({
            "user_id": uid, "name": u.name or u.username, "username": u.username,
            "role": u.role, "is_active": u.is_active, **data[uid],
        })
    employees.sort(key=lambda e: (e["role"] != "emp", -e["sales"]["amount"], e["name"]))

    return Response({
        "start": start, "end": end,
        "employees": employees,
        "warnings": warnings,
    })