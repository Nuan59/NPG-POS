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
    """
    แปลงรหัสเป็นตัวเลข
    NOWTT = 14500
    CWTTT = 25000
    """
    if not encoded or not isinstance(encoded, str):
        return 0
    
    upper = encoded.strip().upper()
    decoded = ''
    
    for char in upper:
        if char in CODE_MAP:
            decoded += CODE_MAP[char]
        else:
            return 0  # ถ้าเจอตัวอักษรแปลก ให้คืน 0
    
    try:
        return int(decoded)
    except:
        return 0


def get_bike_cost(bike):
    """
    ✅ ดึงต้นทุนจาก wholesale_price (รองรับทั้งตัวเลขและรหัส)
    - ถ้าเป็นตัวเลข → ใช้เลย
    - ถ้าเป็นรหัส → ถอดรหัส
    """
    if not bike.wholesale_price:
        return 0
    
    value = str(bike.wholesale_price).strip()
    
    # ✅ เช็คว่าเป็นตัวเลขหรือไม่
    if value.replace('.', '').replace('-', '').isdigit():
        # เป็นตัวเลข → ใช้เลย
        try:
            return float(value)
        except:
            return 0
    else:
        # เป็นรหัส → ถอดรหัส
        decoded = decode_price(value)
        return decoded


# ============================================================
# SALES REPORTS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_volume(request):
    """
    ยอดขายรายเดือน (จำนวนคันรวม)
    """
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
    """
    ยอดขายรายเดือน แยกตามประเภทรถ (รถใหม่ / รถมือสอง)
    - ใช้ Bike.category: new / pre_owned
    
    Note: Order มี bikes เป็น ManyToMany
    """
    # เก็บผลลัพธ์
    result_map = {}
    
    # วนลูปทุก Order
    for order in Order.objects.all():
        if not order.sale_date:
            continue
        
        year = order.sale_date.year
        month_name = THAI_MONTHS.get(order.sale_date.month)
        
        # สร้าง key
        key = f"{year}-{month_name}"
        
        if key not in result_map:
            result_map[key] = {
                "year": year,
                "month": month_name,
                "new": 0,
                "pre_owned": 0
            }
        
        # นับรถแต่ละประเภทใน Order นี้
        result_map[key]["new"] += order.bikes.filter(category="new").count()
        result_map[key]["pre_owned"] += order.bikes.filter(category="pre_owned").count()
    
    # แปลงเป็น list และเรียง
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_payment_method(request):
    """
    ยอดขายแยกตามวิธีชำระเงิน (จำนวนคัน)
    """
    qs = (
        Order.objects.values("payment_method")
        .annotate(total_sales=Count("id"))
        .order_by("-total_sales")
    )

    return Response({"data": list(qs)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vehicle_type_total(request):
    """
    ✅ สัดส่วนรถใหม่ vs รถมือสอง (รวมทั้งหมด) - สำหรับ Pie Chart
    
    Note: Order มี bikes เป็น ManyToMany
    """
    # นับรถใหม่ (ดึงจาก bikes ที่อยู่ใน Order)
    new_count = 0
    pre_owned_count = 0
    
    # วนลูปทุก Order
    for order in Order.objects.all():
        # นับรถในแต่ละ Order
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
    """
    ✅ ยอดขายแยกตามรุ่นรถ รายเดือน - สำหรับ Line Chart
    
    Note: Order มี bikes เป็น ManyToMany
    """
    # เก็บผลลัพธ์
    result_map = {}
    
    # วนลูปทุก Order
    for order in Order.objects.select_related().all():
        if not order.sale_date:
            continue
        
        year = order.sale_date.year
        month_index = order.sale_date.month - 1
        month_name = THAI_MONTHS.get(order.sale_date.month)
        
        # วนลูปทุก bike ใน order นี้
        for bike in order.bikes.all():
            model_name = bike.model_name or "ไม่ระบุ"
            
            # สร้าง key
            key = f"{year}-{month_name}-{model_name}"
            
            if key not in result_map:
                result_map[key] = {
                    "year": year,
                    "month": month_name,
                    "model_name": model_name,
                    "total": 0
                }
            
            result_map[key]["total"] += 1
    
    # แปลงเป็น list และเรียง
    data = list(result_map.values())
    data.sort(key=lambda x: (x["year"], list(THAI_MONTHS.values()).index(x["month"])))
    
    return Response({"data": data})


# ============================================================
# INVENTORY REPORTS (เดิม ไม่แตะ)
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
    - ต้นทุน (จาก wholesale_price ที่ decode แล้ว)
    - รายได้ (จาก sale_price)
    - ค่าใช้จ่ายเพิ่มเติม (จาก additional_fees)
    - กำไรสุทธิ
    """
    
    result_map = {}
    
    # วนลูปทุก Order
    for order in Order.objects.select_related('customer').prefetch_related('bikes', 'additional_fees').all():
        if not order.sale_date:
            continue
        
        year = order.sale_date.year
        month_name = THAI_MONTHS.get(order.sale_date.month)
        key = f"{year}-{month_name}"
        
        if key not in result_map:
            result_map[key] = {
                "year": year,
                "month": month_name,
                "revenue": 0,        # รายได้
                "cost": 0,           # ต้นทุน
                "additional_fees": 0, # ค่าใช้จ่ายเพิ่มเติม
                "gross_profit": 0,   # กำไรขั้นต้น
                "net_profit": 0,     # กำไรสุทธิ
                "order_count": 0,    # จำนวนออเดอร์
            }
        
        # รายได้
        revenue = float(order.sale_price or 0)
        result_map[key]["revenue"] += revenue
        
        # ต้นทุน (ดึงจาก bikes ใน order นี้)
        cost = 0
        for bike in order.bikes.all():
            cost += get_bike_cost(bike)  # ✅ ใช้ฟังก์ชันใหม่
        
        result_map[key]["cost"] += cost
        
        # ค่าใช้จ่ายเพิ่มเติม
        additional_fees = 0
        for fee in order.additional_fees.all():
            additional_fees += float(fee.amount or 0)
        
        result_map[key]["additional_fees"] += additional_fees
        
        # จำนวนออเดอร์
        result_map[key]["order_count"] += 1
    
    # คำนวณกำไร
    for key in result_map:
        data = result_map[key]
        data["gross_profit"] = data["revenue"] - data["cost"]
        data["net_profit"] = data["gross_profit"] - data["additional_fees"]
    
    # แปลงเป็น list และเรียง
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
    
    # วนลูปทุก Order
    for order in Order.objects.select_related('customer').prefetch_related('bikes', 'additional_fees').all():
        if not order.sale_date:
            continue
        
        # วนลูปทุก bike ใน order นี้
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
            
            # รายได้ (เฉลี่ยจาก order.sale_price / จำนวนรถใน order)
            bike_count = order.bikes.count()
            revenue_per_bike = float(order.sale_price or 0) / bike_count if bike_count > 0 else 0
            
            result_map[model_name]["revenue"] += revenue_per_bike
            
            # ต้นทุน
            result_map[model_name]["cost"] += get_bike_cost(bike)  # ✅ ใช้ฟังก์ชันใหม่
            
            result_map[model_name]["count"] += 1
    
    # คำนวณกำไร
    for model in result_map:
        data = result_map[model]
        data["gross_profit"] = data["revenue"] - data["cost"]
    
    # แปลงเป็น list และเรียง
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
    
    # วนลูปทุก Order
    for order in Order.objects.prefetch_related('bikes', 'additional_fees').all():
        total_revenue += float(order.sale_price or 0)
        
        # ต้นทุน
        for bike in order.bikes.all():
            total_cost += get_bike_cost(bike)  # ✅ ใช้ฟังก์ชันใหม่
        
        # ค่าใช้จ่ายเพิ่มเติม
        for fee in order.additional_fees.all():
            total_additional_fees += float(fee.amount or 0)
        
        total_orders += 1
    
    gross_profit = total_revenue - total_cost
    net_profit = gross_profit - total_additional_fees
    
    # Profit Margin
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