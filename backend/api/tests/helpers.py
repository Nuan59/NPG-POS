from datetime import date, timedelta

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import Customer, NPGAccount, Order, User


def make_user(username="staff", role="emp", name=None):
    return User.objects.create_user(username=username, password="pw12345", name=name or username, role=role)


def client_for(user=None):
    c = APIClient()
    if user is not None:
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


def make_customer(name="ลูกค้าทดสอบ"):
    return Customer.objects.create(
        name=name, id_card_number="1234567890123", age=30, address="1 ถนนทดสอบ", gender="M", phone="0800000000",
    )


def make_order(customer=None, seller=None, **kw):
    fields = dict(
        sale_date=date.today(), customer=customer or make_customer(), seller=seller,
        payment_method="เงินสด", registration_status="CPL", total=0, total_price=0,
    )
    fields.update(kw)
    return Order.objects.create(**fields)


def make_npg_account(order=None, installment_amount=50000, count=10, overdue_days=0, **kw):
    order = order or make_order()
    today = date.today()
    fields = dict(
        order=order, status="active", account_type="finance", finance_amount=installment_amount * count,
        interest_rate=0, installment_count=count, installment_amount=installment_amount, period_type="รายเดือน",
        paid_count=0, total_paid=0, remaining_balance=installment_amount * count,
        start_date=today - timedelta(days=30 + overdue_days), next_payment_date=today - timedelta(days=overdue_days),
    )
    fields.update(kw)
    return NPGAccount.objects.create(**fields)


# ---------------------------------------------------------------- base สำหรับทุก test

from unittest import mock  # noqa: E402

from django.apps import apps  # noqa: E402
from django.db import connection  # noqa: E402
from django.test import TestCase  # noqa: E402


def _create_missing_tables():
    """
    ตารางที่ไม่ได้อยู่ใน api/models/__init__ (เช่น ระบบส่งเงิน) ถูก import ตอนโหลด URL หลังสร้าง DB ทดสอบแล้ว
    → สร้างให้ครบในฐานข้อมูลทดสอบ (ไม่ยุ่งกับ production)
    """
    import api.models.CashHandover  # noqa: F401
    import api.models.ExpenseRequest  # noqa: F401
    existing = set(connection.introspection.table_names())
    with connection.schema_editor() as editor:
        for model in apps.get_app_config("api").get_models():
            if model._meta.managed and model._meta.db_table not in existing:
                editor.create_model(model)
                existing.add(model._meta.db_table)


class BaseTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        _create_missing_tables()
        cls._geo = mock.patch("api.models.Customer.Customer.geocode_address", return_value=None)
        cls._geo.start()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._geo.stop()

    def setUp(self):
        from api import activity
        activity._table_ready = False
        super().setUp()
