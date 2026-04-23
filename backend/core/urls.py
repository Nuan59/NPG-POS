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
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

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

# ✅ Temp: ลบ Bike ทั้งหมดออกจาก inventory
def delete_all_bikes(request):
    from api.models import Bike
    count, _ = Bike.objects.all().delete()
    return JsonResponse({'status': 'ok', 'deleted': count})

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

    # ✅ Temp endpoint - ลบหลังใช้งาน
    path('dev/migrate/', run_migrate),

    # ✅ Temp endpoint - ลบหลังใช้งาน
    path('dev/delete-all-bikes/', delete_all_bikes),

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

    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]