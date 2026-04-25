from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models.functions import ExtractMonth, ExtractYear
from django.db.models import Count, F, Q

from api.models import Order, Bike


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


def get_bike_cost(bike):
    if not bike.wholesale_price:
        return 0
    
    value = str(bike.wholesale_price).strip()
    
    if value.replace('.', '').replace('-', '').isdigit():
        try:
            return float(value)
        except:
            return 0
    else:
        decoded = decode_price(value)
        return decoded


def get_gift_cost(order):
    """
    ✅ คำนวณต้นทุนของแถมจาก OrderGift
    - ดึง wholesale_price จาก Gift model
    - คูณด้วย quantity
    """
    total_gift_cost = 0
    for order_gift in order.gifts.select_related('item').all():
        if order_gift.item and order_gift.item.wholesale_price:
            total_gift_cost += float(order_gift.item.wholesale_price) * int(order_gift.quantity or 0)
    return total_gift_cost


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
        
        year = order.sale_date.year
        month_name = THAI_MONTHS.get(order.sale_date.month)
        key = f"{year}-{month_name}"
        
        if key not in result_map:
            result_map[key] = {
                "year": year,
                "month": month_name,
                "revenue": 0,
                "cost": 0,
                "additional_fees": 0,
                "gross_profit": 0,
                "net_profit": 0,
                "order_count": 0,
            }
        
        # รายได้
        revenue = float(order.sale_price or 0)
        result_map[key]["revenue"] += revenue
        
        # ต้นทุนรถ
        cost = 0
        for bike in order.bikes.all():
            cost += get_bike_cost(bike)
        result_map[key]["cost"] += cost
        
        # ค่าใช้จ่ายเพิ่มเติม (AdditionalFee เดิม + ต้นทุนของแถม)
        additional_fees = 0
        for fee in order.additional_fees.all():
            additional_fees += float(fee.amount or 0)
        
        # ✅ เพิ่มต้นทุนของแถม
        additional_fees += get_gift_cost(order)
        
        result_map[key]["additional_fees"] += additional_fees
        result_map[key]["order_count"] += 1
    
    # คำนวณกำไร
    for key in result_map:
        data = result_map[key]
        data["gross_profit"] = data["revenue"] - data["cost"]
        data["net_profit"] = data["gross_profit"] - data["additional_fees"]
    
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financial_by_model(request):
    """
    📊 สรุปการเงินแยกตามรุ่นรถ
    """
    
    result_map = {}
    
    for order in Order.objects.select_related('customer').prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
        if not order.sale_date:
            continue
        
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
            revenue_per_bike = float(order.sale_price or 0) / bike_count if bike_count > 0 else 0
            
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
    total_cost = 0
    total_additional_fees = 0
    total_orders = 0
    
    for order in Order.objects.prefetch_related('bikes', 'additional_fees', 'gifts__item').all():
        total_revenue += float(order.sale_price or 0)
        
        for bike in order.bikes.all():
            total_cost += get_bike_cost(bike)
        
        # AdditionalFee เดิม
        for fee in order.additional_fees.all():
            total_additional_fees += float(fee.amount or 0)
        
        # ✅ เพิ่มต้นทุนของแถม
        total_additional_fees += get_gift_cost(order)
        
        total_orders += 1
    
    gross_profit = total_revenue - total_cost
    net_profit = gross_profit - total_additional_fees
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return Response({
        "data": {
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "total_additional_fees": total_additional_fees,
            "gross_profit": gross_profit,
            "net_profit": net_profit,
            "profit_margin": round(profit_margin, 2),
            "total_orders": total_orders,
            "average_profit_per_order": round(net_profit / total_orders, 2) if total_orders > 0 else 0,
        }
    })