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
from api.views.ServiceViewSet import ServiceViewSet
from api.views.CashflowView import CashflowViewSet
from api.views.TaskViewSet import TaskPostViewSet
from api.views.AnnouncementViewSet import AnnouncementViewSet
from api.views.AnnouncementSettingsView import AnnouncementSettingsView
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


# ✅ Temp: ลบรายการ cashflow ที่ซ้ำกัน (เกิดจากบั๊ก auto-save วนไม่หยุด) สำหรับวันที่ระบุ
# เรียกผ่าน: /dev/cleanup-cashflow-duplicates/?date=YYYY-MM-DD
# เก็บไว้แค่ 1 รายการต่อกลุ่มที่ข้อมูลเหมือนกันทุก field (เอาอันที่ id น้อยสุด/สร้างก่อน)
# ใช้ raw SQL เพราะจำนวนซ้ำอาจมีหลักแสน-ล้านแถว ทำผ่าน Django ORM ทีละแถวจะช้าเกินไป
def cleanup_cashflow_duplicates(request):
    from django.db import connection
    date_str = request.GET.get("date")
    if not date_str:
        return JsonResponse({'status': 'error', 'message': 'ต้องระบุ ?date=YYYY-MM-DD'})
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM cashflow_entry WHERE date = %s", [date_str])
            before_count = cursor.fetchone()[0]

            cursor.execute(
                """
                DELETE FROM cashflow_entry
                WHERE date = %s
                AND id NOT IN (
                    SELECT MIN(id) FROM cashflow_entry
                    WHERE date = %s
                    GROUP BY section, description, income, sent, expense, change, deposit_return, cash_in, created_by
                )
                """,
                [date_str, date_str],
            )
            deleted_count = cursor.rowcount

            cursor.execute("SELECT COUNT(*) FROM cashflow_entry WHERE date = %s", [date_str])
            after_count = cursor.fetchone()[0]

        return JsonResponse({
            'status': 'ok', 'date': date_str,
            'before': before_count, 'deleted': deleted_count, 'after': after_count,
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: สร้างตาราง Task ด้วย raw SQL แล้ว fake-mark migration ที่ค้างว่า apply แล้ว
# กันชนตาราง cashflow เก่าที่เคยสร้างด้วย raw SQL มาก่อน (ไม่ผ่าน migration history)
def fix_task_migration(request):
    from django.db import connection
    from django.apps import apps as django_apps
    from django.core.management import call_command
    from io import StringIO

    try:
        User = django_apps.get_model('api', 'User')
        user_table = User._meta.db_table

        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_post (
                    id BIGSERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    post_type VARCHAR(20) NOT NULL DEFAULT 'general',
                    created_by VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS task_assignment (
                    id BIGSERIAL PRIMARY KEY,
                    post_id BIGINT NOT NULL REFERENCES task_post(id) ON DELETE CASCADE,
                    employee_id BIGINT NOT NULL REFERENCES "{user_table}"(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    completed_at TIMESTAMPTZ NULL,
                    UNIQUE (post_id, employee_id)
                );
            """)

        out = StringIO()
        call_command('migrate', 'api', fake=True, stdout=out)

        return JsonResponse({'status': 'ok', 'user_table': user_table, 'output': out.getvalue()})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


router = routers.DefaultRouter()

# ✅ Temp: เพิ่มคอลัมน์ detail ให้ตาราง announcement (รายละเอียดเพิ่มเติมของประกาศ)
def add_announcement_detail_column(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE announcement ADD COLUMN IF NOT EXISTS detail TEXT NOT NULL DEFAULT '';")
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์ detail ให้ announcement เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: เพิ่มคอลัมน์ due_date ให้ตาราง task_post (กำหนดเวลาของประกาศทั่วไป)
def add_task_post_due_date_column(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE task_post ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;")
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์ due_date ให้ task_post เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: สร้างตาราง announcement (ประกาศตัวหนังสือไหลใต้ Navbar)
def create_announcement_table(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS announcement (
                    id SERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_by VARCHAR(255) NOT NULL DEFAULT '',
                    created_by_username VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
        return JsonResponse({'status': 'ok', 'message': 'สร้างตาราง announcement เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: สร้างตาราง announcement_settings (เก็บความเร็วแถบไหล)
def create_announcement_settings_table(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS announcement_settings (
                    id SERIAL PRIMARY KEY,
                    speed_seconds INTEGER NOT NULL DEFAULT 40
                );
            """)
        return JsonResponse({'status': 'ok', 'message': 'สร้างตาราง announcement_settings เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: เพิ่มระบบติดตามความคืบหน้างาน (เป้าหมายจำนวน + ประวัติอัปเดตรายวัน)
def add_task_progress_columns(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE task_assignment ADD COLUMN IF NOT EXISTS target_quantity INTEGER NULL;")
            cursor.execute("ALTER TABLE task_assignment ADD COLUMN IF NOT EXISTS target_unit VARCHAR(50) NOT NULL DEFAULT '';")
            cursor.execute("ALTER TABLE task_assignment ADD COLUMN IF NOT EXISTS current_progress INTEGER NOT NULL DEFAULT 0;")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_progress_log (
                    id SERIAL PRIMARY KEY,
                    assignment_id INTEGER NOT NULL REFERENCES task_assignment(id) ON DELETE CASCADE,
                    amount INTEGER NOT NULL,
                    note TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มระบบติดตามความคืบหน้าเรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: เพิ่มคอลัมน์ due_date ให้ตาราง task_assignment (กำหนดเวลางานแยกรายบุคคล)
def add_task_due_date_column(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE task_assignment ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;")
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์ due_date เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: เพิ่มคอลัมน์ transaction_type/transaction_type_detail/mileage ให้ตาราง Order
def add_order_service_columns(request):
    from django.db import connection
    from django.apps import apps as django_apps
    try:
        Order = django_apps.get_model('api', 'Order')
        table = Order._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f"ALTER TABLE \"{table}\" ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) NOT NULL DEFAULT 'ขาย';")
            cursor.execute(f"ALTER TABLE \"{table}\" ADD COLUMN IF NOT EXISTS transaction_type_detail VARCHAR(255) NOT NULL DEFAULT '';")
            cursor.execute(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS mileage INTEGER NULL;')
        return JsonResponse({'status': 'ok', 'table': table, 'message': 'เพิ่มคอลัมน์เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: ทำคอลัมน์ chassi (เลขตัวถัง) ของตาราง Bike ให้ไม่บังคับใน DB
# กันเคสลงทะเบียนรถลูกค้าที่ไม่ได้ซื้อกับเราแล้วไม่มีเลขตัวถัง
def make_chassi_optional(request):
    from django.db import connection
    from django.apps import apps as django_apps
    try:
        Bike = django_apps.get_model('api', 'Bike')
        table = Bike._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN chassi DROP NOT NULL;')
        return JsonResponse({'status': 'ok', 'table': table, 'message': 'เลขตัวถังไม่บังคับแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: เพิ่มคอลัมน์ created_by_username / note ที่ตาราง Task (พนักงานโพสต์กันเองได้ + ใส่หมายเหตุตอนเปลี่ยนสถานะ)
def add_task_note_columns(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE task_post ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(255) NOT NULL DEFAULT '';")
            cursor.execute("ALTER TABLE task_assignment ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';")
        return JsonResponse({'status': 'ok', 'message': 'เพิ่มคอลัมน์เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})
# ✅ Temp: สร้างตาราง npg_fees (ค่าธรรมเนียมอื่นๆ ของบัญชี NPG)
def create_npg_fee_table(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS npg_fees (
                    id BIGSERIAL PRIMARY KEY,
                    account_id BIGINT NOT NULL REFERENCES npg_accounts(id) ON DELETE CASCADE,
                    fee_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    description VARCHAR(255) NOT NULL,
                    amount NUMERIC(10, 2) NOT NULL,
                    payment_method VARCHAR(20) NOT NULL DEFAULT '',
                    note TEXT NOT NULL DEFAULT '',
                    created_by VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS npg_fees_account_idx ON npg_fees (account_id);")
        return JsonResponse({'status': 'ok', 'message': 'สร้างตาราง npg_fees เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

# ✅ Temp: สร้างตาราง service_record (งานบริการ ซ่อม/ต่อภาษี+พรบ/อื่นๆ แยกจากงานขาย)
def create_service_record_table(request):
    from django.db import connection
    from django.apps import apps as django_apps
    try:
        customer_table = django_apps.get_model('api', 'Customer')._meta.db_table
        bike_table = django_apps.get_model('api', 'Bike')._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS service_record (
                    id BIGSERIAL PRIMARY KEY,
                    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
                    customer_id BIGINT NULL REFERENCES "{customer_table}"(id) ON DELETE SET NULL,
                    bike_id BIGINT NULL REFERENCES "{bike_table}"(id) ON DELETE SET NULL,
                    transaction_type VARCHAR(20) NOT NULL,
                    transaction_type_detail VARCHAR(255) NOT NULL DEFAULT '',
                    mileage INTEGER NULL,
                    items JSONB NOT NULL DEFAULT '[]'::jsonb,
                    total DOUBLE PRECISION NOT NULL DEFAULT 0,
                    payment_type VARCHAR(50) NOT NULL DEFAULT '',
                    transfer_bank VARCHAR(50) NOT NULL DEFAULT '',
                    check_number VARCHAR(100) NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    created_by VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    legacy_order_id INTEGER NULL UNIQUE
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS service_record_bike_idx ON service_record (bike_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS service_record_customer_idx ON service_record (customer_id);")
        return JsonResponse({'status': 'ok', 'message': 'สร้างตาราง service_record เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})


# ✅ Temp: ย้ายงานซ่อม/ต่อภาษี/อื่นๆ ที่เคยบันทึกในตาราง Order มาไว้ที่ service_record
# - เรียกซ้ำได้ ไม่ย้ายซ้ำ (เช็คจาก legacy_order_id)
# - ไม่ลบ Order เดิม แค่ซ่อนจากหน้าขาย (OrderViewSet กรองเฉพาะ "ขาย" แล้ว)
# - แกะรายการจาก notes แบบเดียวกับที่ frontend เคยบันทึก "- รายละเอียด: 1,234 บาท"
def migrate_service_orders(request):
    import re
    from api.models import Order
    from api.models.ServiceRecord import ServiceRecord
    pattern = re.compile(r'^-\s*(.+?):\s*([\d,]+)\s*บาท\s*$')
    try:
        moved, skipped = [], 0
        for order in Order.objects.exclude(transaction_type='ขาย').prefetch_related('bikes'):
            if ServiceRecord.objects.filter(legacy_order_id=order.id).exists():
                skipped += 1
                continue

            items, other_lines = [], []
            for line in (order.notes or '').split('\n'):
                m = pattern.match(line.strip())
                if m:
                    items.append({'description': m.group(1).strip(), 'amount': float(m.group(2).replace(',', ''))})
                else:
                    other_lines.append(line)

            total = sum(i['amount'] for i in items) or float(order.total or 0)
            if not items:
                items = [{'description': order.transaction_type_detail or order.transaction_type, 'amount': total}]

            record = ServiceRecord.objects.create(
                service_date=order.sale_date,
                customer=order.customer,
                bike=order.bikes.first(),
                transaction_type=order.transaction_type,
                transaction_type_detail=order.transaction_type_detail or '',
                mileage=order.mileage,
                items=items,
                total=total,
                payment_type=order.payment_type or '',
                transfer_bank=order.transfer_bank or '',
                check_number=order.check_number or '',
                notes='\n'.join(other_lines).strip(),
                created_by=getattr(order.seller, 'username', '') if order.seller else '',
                legacy_order_id=order.id,
            )
            moved.append({'order_id': order.id, 'service_id': record.id})
        return JsonResponse({'status': 'ok', 'moved_count': len(moved), 'skipped': skipped, 'moved': moved})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

router.register('customers', CustomerViewSet, basename="Customers")
router.register('inventory', BikeViewSet, basename="Inventory")
router.register('storage', StorageViewSet, basename="Storage")
router.register('order', OrderViewSet, basename="Order")
router.register('service', ServiceViewSet, basename='service')
router.register('employees', UsersViewset, basename="Employees")
router.register('gifts', GiftViewSet, basename="Gifts")
router.register(r'npg/accounts', NPGAccountViewSet, basename='npg-account')
router.register(r'npg/payments', NPGPaymentViewSet, basename='npg-payment')
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'issue-updates', IssueUpdateViewSet, basename='issue-update')
router.register(r'cashflow', CashflowViewSet, basename='cashflow')
router.register(r'tasks/posts', TaskPostViewSet, basename='task-posts')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ Temp endpoint
    path('dev/migrate/', run_migrate),
    path('dev/migrate-only/', run_migrate_only),
    path('dev/fake-0019/', fake_migrate_0019),
    path('dev/fake-0021/', fake_migrate_0021),
    path('dev/fix-task-migration/', fix_task_migration),
    path('dev/add-task-note-columns/', add_task_note_columns),
    path('dev/make-chassi-optional/', make_chassi_optional),
    path('dev/add-order-service-columns/', add_order_service_columns),
    path('dev/add-task-due-date-column/', add_task_due_date_column),
    path('dev/add-task-post-due-date-column/', add_task_post_due_date_column),
    path('dev/create-announcement-table/', create_announcement_table),
    path('dev/add-announcement-detail-column/', add_announcement_detail_column),
    path('dev/create-announcement-settings-table/', create_announcement_settings_table),
    path('dev/add-task-progress-columns/', add_task_progress_columns),
    # ✅ ต้องอยู่ก่อน include(router.urls) เสมอ ไม่งั้นชนกับ /announcements/{id}/ ของ router
    path('announcements/settings/', AnnouncementSettingsView.as_view()),
    path('dev/create-workhours/', create_workhours_table),
    path('dev/create-cashflow-tables/', create_cashflow_tables),
    path('dev/add-cashflow-count-columns/', add_cashflow_count_columns),
    path('dev/add-cashflow-cash-in-column/', add_cashflow_cash_in_column),
    path('dev/debug-list-cashflow-entries/', debug_list_cashflow_entries),
    path('dev/chassis/', get_all_chassis),
    path('dev/fix-npg-yearly/', fix_npg_yearly_accounts),
    path('dev/create-npg-fee-table/', create_npg_fee_table),
    path('dev/create-service-record-table/', create_service_record_table),
    path('dev/migrate-service-orders/', migrate_service_orders),

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

    path('dev/cleanup-cashflow-duplicates/', cleanup_cashflow_duplicates),
]