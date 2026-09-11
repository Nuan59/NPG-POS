from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework import routers
from api.views import (
    CustomerViewSet,
    UsersViewset,
    BikeViewSet,
    StorageViewSet,
    OrderViewSet,
    CustomerOrdersList,
    StorageTransferList,
    GiftViewSet,
    ReportsView,
    CustomerMapView,
    PostalCodeLookupView,
    IssueViewSet,
    IssueUpdateViewSet,
)
from api.views.NPGViewSet import NPGAccountViewSet, NPGPaymentViewSet
from api.views.CashflowView import CashflowViewSet
from api.views.RegistrationView import registration_list, update_status, status_history, activity_feed
from rest_framework_simplejwt.views import TokenRefreshView
from api.views.CustomTokenView import CustomTokenObtainPairView
from api.views.WorkHoursView import WorkHoursView

# ✅ Temp: รัน migration ผ่าน browser
def run_migrate(request):
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    try:
        call_command('makemigrations', '--no-input', stdout=out)
        call_command('migrate', stdout=out)
        return JsonResponse({'status': 'ok', 'output': out.getvalue()})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: รันแค่ migrate อย่างเดียว (ไม่รัน makemigrations) กันไปกระทบ state ของโมเดลอื่น
# ใช้จุดนี้แทน run_migrate ปกติ เมื่อ makemigrations ไปสร้าง migration ผิดๆ จากตารางอื่นที่ไม่เกี่ยว
def run_migrate_only(request):
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    try:
        call_command('migrate', stdout=out)
        return JsonResponse({'status': 'ok', 'output': out.getvalue()})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: fake migration 0019 แล้ว migrate ต่อ
def fake_migrate_0019(request):
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    try:
        call_command('migrate', 'api', '0019', '--fake', stdout=out)
        call_command('migrate', stdout=out)
        return JsonResponse({'status': 'ok', 'output': out.getvalue()})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: ดึง chassis ทั้งหมดใน DB
def get_all_chassis(request):
    from api.models import Bike
    chassis_list = list(Bike.objects.values_list('chassi', flat=True))
    return JsonResponse({'count': len(chassis_list), 'chassis': chassis_list})



def fake_migrate_0021(request):
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    try:
        call_command('migrate', 'api', '0021', '--fake', stdout=out)
        return JsonResponse({'status': 'ok', 'output': out.getvalue()})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


def create_workhours_table(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_workhours (
                    id SERIAL PRIMARY KEY,
                    start_hour INTEGER NOT NULL DEFAULT 8,
                    start_minute INTEGER NOT NULL DEFAULT 0,
                    end_hour INTEGER NOT NULL DEFAULT 18,
                    end_minute INTEGER NOT NULL DEFAULT 0,
                    is_enabled BOOLEAN NOT NULL DEFAULT TRUE
                );
            """)
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES 
                    ('api', '0020_fix_chassi_unique_gift_wholesale_pr', NOW()),
                    ('api', '0021_bike_old_registration_plate', NOW()),
                    ('api', '0022_add_workhours', NOW())
                ON CONFLICT DO NOTHING;
            """)
        return JsonResponse({'status': 'ok', 'message': 'Done'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: สร้างตาราง cashflow_entry / cashflow_day_meta ตรงๆ ด้วย raw SQL แทนการรัน migrate
# (แพทเทิร์นเดียวกับ create_workhours_table ด้านบน)
def create_cashflow_tables(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cashflow_entry (
                    id BIGSERIAL PRIMARY KEY,
                    date DATE NOT NULL,
                    section VARCHAR(10) NOT NULL,
                    seq INTEGER NOT NULL DEFAULT 0,
                    description VARCHAR(255) NOT NULL DEFAULT '',
                    income NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    sent NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    expense NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    change NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    deposit_return NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    created_by VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS cashflow_entry_date_idx
                    ON cashflow_entry (date);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS cashflow_date_section_idx
                    ON cashflow_entry (date, section);
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cashflow_day_meta (
                    id BIGSERIAL PRIMARY KEY,
                    date DATE NOT NULL UNIQUE,
                    cash_opening_override NUMERIC(12, 2) NULL,
                    transfer_opening_override NUMERIC(12, 2) NULL,
                    checker_name VARCHAR(255) NOT NULL DEFAULT '',
                    checker_date DATE NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS cashflow_day_meta_date_idx
                    ON cashflow_day_meta (date);
            """)
        return JsonResponse({'status': 'ok', 'message': 'สร้างตาราง cashflow_entry และ cashflow_day_meta เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: เพิ่มคอลัมน์บันทึกการนับเงินสดปลายวัน เข้าตาราง cashflow_day_meta ที่มีอยู่แล้ว
# (ตารางมีอยู่แล้ว แค่เพิ่มคอลัมน์ใหม่ - ปลอดภัยกว่าสร้างตารางใหม่ทั้งตาราง)
def add_cashflow_count_columns(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE cashflow_day_meta
                    ADD COLUMN IF NOT EXISTS counted_cash_amount NUMERIC(12, 2) NULL,
                    ADD COLUMN IF NOT EXISTS counted_by VARCHAR(255) NOT NULL DEFAULT '',
                    ADD COLUMN IF NOT EXISTS counted_at TIMESTAMP WITH TIME ZONE NULL;
            """)
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์บันทึกการนับเงินสดเรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: เพิ่มคอลัมน์ cash_in (เปิดบิล) เข้าตาราง cashflow_entry ที่มีอยู่แล้ว
def add_cashflow_cash_in_column(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE cashflow_entry
                    ADD COLUMN IF NOT EXISTS cash_in NUMERIC(12, 2) NOT NULL DEFAULT 0;
            """)
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์ cash_in (เปิดบิล) เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: ดูข้อมูลดิบทั้งหมดในตาราง cashflow_entry ตรงๆ (ไม่ผ่าน filter วันที่ใดๆ)
# ใช้เช็คว่าข้อมูลยังอยู่ในฐานข้อมูลจริงไหม หรือหายไปจริงๆ
def debug_list_cashflow_entries(request):
    from api.models.Cashflow import CashflowEntry, CashflowDayMeta
    from django.core.serializers.json import DjangoJSONEncoder
    try:
        entries = list(CashflowEntry.objects.all().order_by('-date', 'section', 'seq').values(
            'id', 'date', 'section', 'seq', 'description',
            'income', 'sent', 'expense', 'change', 'deposit_return', 'cash_in',
            'created_by', 'created_at',
        ))
        metas = list(CashflowDayMeta.objects.all().order_by('-date').values(
            'id', 'date', 'cash_opening_override', 'transfer_opening_override',
            'checker_name', 'checker_date', 'counted_cash_amount', 'counted_by', 'counted_at',
        ))
        return JsonResponse({
            'status': 'ok',
            'total_entries': len(entries),
            'entries': entries,
            'total_day_meta': len(metas),
            'day_meta': metas,
        }, encoder=DjangoJSONEncoder)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: เพิ่มคอลัมน์ late_fee (ค่าปรับจ่ายล่าช้า) เข้าตาราง npg_payments ที่มีอยู่แล้ว
def add_npg_late_fee_column(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE npg_payments
                    ADD COLUMN IF NOT EXISTS late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
            """)
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์ late_fee เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: แก้ข้อมูลบัญชี NPG ที่เป็น "รายปี" จริง (ตาม Order.npg_period) แต่ตอนสร้างบันทึก
# period_type / next_payment_date ผิดเป็นรายเดือน (บั๊กเก่าก่อนแก้ OrderViewSet.py)
# แก้แค่ period_type + next_payment_date เท่านั้น ไม่แตะ remaining_balance/installment_amount
# เพราะยอดพวกนั้นคำนวณถูกต้องอยู่แล้วตั้งแต่ตอนสร้าง (ไม่ขึ้นกับ period_type)
def fix_npg_yearly_accounts(request):
    from api.models import NPGAccount
    from datetime import timedelta

    try:
        accounts = NPGAccount.objects.select_related('order').all()
        fixed = []

        for acc in accounts:
            order_period = getattr(acc.order, 'npg_period', None) if acc.order else None

            # เฉพาะกรณี Order บอกว่าเป็นรายปีจริง แต่ตัวบัญชีบันทึกผิดเป็นรายเดือน
            if order_period == 'รายปี' and acc.period_type != 'รายปี':
                base_date = acc.last_payment_date or acc.start_date
                acc.period_type = 'รายปี'
                acc.next_payment_date = base_date + timedelta(days=365)
                acc.save()
                fixed.append({
                    'account_id': acc.id,
                    'order_id': acc.order.id if acc.order else None,
                    'new_next_payment_date': acc.next_payment_date.isoformat(),
                })

        return JsonResponse({
            'status': 'ok',
            'fixed_count': len(fixed),
            'fixed_accounts': fixed,
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


router = routers.DefaultRouter()
router.register('customers', CustomerViewSet, basename="Customers")
router.register('inventory', BikeViewSet, basename="Inventory")
router.register('storage', StorageViewSet, basename="Storage")
router.register('order', OrderViewSet, basename="Order")
router.register('employees', UsersViewset, basename="Employees")
router.register('gifts', GiftViewSet, basename="Gifts")
router.register(r'npg/accounts', NPGAccountViewSet, basename='npg-account')
router.register(r'npg/payments', NPGPaymentViewSet, basename='npg-payment')
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'issue-updates', IssueUpdateViewSet, basename='issue-update')
router.register(r'cashflow', CashflowViewSet, basename='cashflow')

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ Temp endpoint
    path('dev/migrate/', run_migrate),
    path('dev/migrate-only/', run_migrate_only),
    path('dev/fake-0019/', fake_migrate_0019),
    path('dev/fake-0021/', fake_migrate_0021),
    path('dev/create-workhours/', create_workhours_table),
    path('dev/create-cashflow-tables/', create_cashflow_tables),
    path('dev/add-cashflow-count-columns/', add_cashflow_count_columns),
    path('dev/add-cashflow-cash-in-column/', add_cashflow_cash_in_column),
    path('dev/debug-list-cashflow-entries/', debug_list_cashflow_entries),
    path('dev/add-npg-late-fee-column/', add_npg_late_fee_column),
    path('dev/chassis/', get_all_chassis),
    path('dev/fix-npg-yearly/', fix_npg_yearly_accounts),

    path('customers/map/', CustomerMapView.as_view(), name='customer-map'),
    path('postal-code/', PostalCodeLookupView.as_view(), name='postal-code-lookup'),
    path("customers/<int:pk>/orders/", CustomerOrdersList.as_view()),
    
    path('customers/birthdays/upcoming/', CustomerViewSet.as_view({'get': 'upcoming_birthdays'}), name='customers-birthdays-upcoming'),
    path('customers/birthdays/today/', CustomerViewSet.as_view({'get': 'birthdays_today'}), name='customers-birthdays-today'),
    
    path('order/registration_expiring/', OrderViewSet.as_view({'get': 'registration_expiring'}), name='order-registration-expiring'),
    
    path("", include(router.urls)),
    path("storage/transfer/history/", StorageTransferList.as_view()),

    path('registration/', registration_list, name='registration-list'),
    path('registration/activity/', activity_feed, name='registration-activity'),
    path('registration/<int:pk>/update_status/', update_status, name='registration-update-status'),
    path('registration/<int:pk>/history/', status_history, name='registration-history'),

    path('reports/financial/summary/', ReportsView.financial_summary),
    path('reports/financial/by_model/', ReportsView.financial_by_model),
    path('reports/financial/overview/', ReportsView.financial_overview),
    path("reports/sales/volume/", ReportsView.sales_volume),
    path("reports/sales/payment_method/", ReportsView.sales_payment_method),
    path("reports/sales/vehicle-type/", ReportsView.sales_by_condition),
    path("reports/sales/vehicle_type_total/", ReportsView.vehicle_type_total),
    path("reports/sales/by_model/", ReportsView.sales_by_model),
    path("reports/inventory/volume/", ReportsView.inventory_volume),
    path("reports/inventory/brands/", ReportsView.inventory_brands),
    path("reports/inventory/models/", ReportsView.inventory_models),
    path("reports/inventory/storages/", ReportsView.inventory_storages),

    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("work-hours/", WorkHoursView.as_view(), name="work-hours"),
]