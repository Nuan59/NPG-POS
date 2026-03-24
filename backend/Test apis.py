from api.models import Order, Bike
from django.db.models import Count, Q
from django.db.models.functions import ExtractMonth, ExtractYear

print("=" * 60)
print("🧪 ทดสอบข้อมูลในระบบ")
print("=" * 60)

# 1. ตรวจสอบจำนวน Orders
total_orders = Order.objects.count()
print(f"\n✅ จำนวน Orders ทั้งหมด: {total_orders}")

if total_orders == 0:
    print("❌ ไม่มีข้อมูล Orders ในระบบ!")
    print("   → ต้องสร้างข้อมูลทดสอบก่อน")
else:
    # 2. ตรวจสอบข้อมูล Bike.category
    new_count = Order.objects.filter(bike__category="new").count()
    pre_owned_count = Order.objects.filter(bike__category="pre_owned").count()
    
    print(f"\n📊 ยอดขายแยกตามประเภท:")
    print(f"   - รถใหม่: {new_count} คัน")
    print(f"   - รถมือสอง: {pre_owned_count} คัน")
    
    if new_count + pre_owned_count == 0:
        print("\n❌ Order มี แต่ไม่มี bike.category!")
        print("   → ตรวจสอบว่า Order.bike มีค่าหรือไม่")
        
        # ตรวจสอบเพิ่มเติม
        orders_with_bike = Order.objects.exclude(bike__isnull=True).count()
        print(f"   → Orders ที่มี bike: {orders_with_bike}")
    
    # 3. ตรวจสอบรุ่นรถ
    print(f"\n🏍️ รุ่นรถที่มีในระบบ:")
    models = Order.objects.select_related('bike').values_list('bike__model_name', flat=True).distinct()
    for i, model in enumerate(models, 1):
        if model:
            count = Order.objects.filter(bike__model_name=model).count()
            print(f"   {i}. {model}: {count} คัน")
    
    if not any(models):
        print("   ❌ ไม่มีข้อมูล model_name!")

print("\n" + "=" * 60)




























