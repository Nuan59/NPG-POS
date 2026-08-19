from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models.functions import ExtractMonth, ExtractYear
from django.db.models import Count, F, Q

from api.models import Order, Bike
from api.models.Cashflow import CashflowEntry


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
    """
    result = {}
    for entry in CashflowEntry.objects.all():
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
    """✅ ยอดรวมรายจ่ายทั้งหมดจากระบบรายรับ-รายจ่าย (สำหรับภาพรวมทั้งหมด ไม่แยกเดือน)"""
    total = 0
    for entry in CashflowEntry.objects.all():
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
        Order.objects.all()
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
    
    for order in Order.objects.all():
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
        Order.objects.values("payment_method")
        .annotate(total_sales=Count("id"))
        .order_by("-total_sales")
    )

    return Response({"data": list(qs)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vehicle_type_total(request):
    new_count = 0
    pre_owned_count = 0
    
    for order in Order.objects.all():
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
    
    for order in Order.objects.select_related().all():
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
    
    result_map = {}
    
    for order in Order.objects.select_related('customer').prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
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
    
    # ✅ เติมยอดรายจ่ายจากระบบรายรับ-รายจ่าย - รวมเข้าเดือนที่มีอยู่แล้ว หรือสร้างเดือนใหม่ถ้าเดือนนั้นไม่มีออเดอร์เลย
    cashflow_expenses_by_month = get_cashflow_expenses_by_month()
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
    year_param = request.query_params.get('year')
    month_param = request.query_params.get('month')

    result_map = {}
    
    for order in Order.objects.select_related('customer').prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
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
    
    total_revenue = 0
    total_additional_fee_revenue = 0  # ✅ ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า (แยกโชว์ต่างหาก)
    total_cost = 0
    total_additional_fees = 0
    total_orders = 0
    
    for order in Order.objects.prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
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
    total_cashflow_expense = get_total_cashflow_expense()  # ✅ รายจ่ายจากระบบรายรับ-รายจ่าย
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