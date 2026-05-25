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

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ Temp endpoint
    path('dev/migrate/', run_migrate),
    path('dev/fake-0019/', fake_migrate_0019),
    path('dev/fake-0021/', fake_migrate_0021),
    path('dev/create-workhours/', create_workhours_table),
    path('dev/chassis/', get_all_chassis),

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