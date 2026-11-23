"""ปิดบัญชี NPG: ต้องลงรายรับ / ต้องเลือกวิธีชำระ / ยอดต้องสมเหตุสมผล / แก้ย้อนหลังแล้วบัญชียังปิดอยู่"""
from decimal import Decimal

from api.models import NPGAccount, NPGPayment
from api.models.Cashflow import CashflowEntry

from .helpers import BaseTestCase, client_for, make_npg_account, make_user


def income(pid):
    return sum((e.income for e in CashflowEntry.objects.filter(auto_source="npg_payment", auto_source_id=pid)), Decimal("0"))


class CloseAccountTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff", "emp")
        self.admin = make_user("boss", "adm")
        self.acc = make_npg_account(installment_amount=3000, count=10)

    def close(self, **body):
        return client_for(self.staff).post(f"/npg/accounts/{self.acc.id}/close_account/", body, format="json")

    def test_close_requires_payment_method(self):
        r = self.close()
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(NPGAccount.objects.get(pk=self.acc.id).status, "active")

    def test_close_cash_records_income(self):
        r = self.close(payment_method="เงินสด")
        self.assertEqual(r.status_code, 200, r.content)
        amt = Decimal(str(r.data["close_calculation"]["close_amount"]))
        self.assertGreater(amt, 0)
        self.assertEqual(income(r.data["payment_id"]), amt)
        acc = NPGAccount.objects.get(pk=self.acc.id)
        self.assertEqual((acc.status, float(acc.remaining_balance)), ("closed", 0))

    def test_close_amount_out_of_range_rejected(self):
        self.assertEqual(self.close(payment_method="เงินสด", close_amount=-5).status_code, 400)
        self.assertEqual(self.close(payment_method="เงินสด", close_amount=999999).status_code, 400)

    def test_admin_edit_after_close_keeps_closed(self):
        pid = self.close(payment_method="เงินสด").data["payment_id"]
        r = client_for(self.admin).patch(f"/npg/payments/{pid}/edit/", {"payment_method": "เงินโอน"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        acc = NPGAccount.objects.get(pk=self.acc.id)
        self.assertEqual((acc.status, float(acc.remaining_balance)), ("closed", 0))

    def test_delete_close_payment_reopens(self):
        pid = self.close(payment_method="เงินสด").data["payment_id"]
        r = client_for(self.admin).delete(f"/npg/payments/{pid}/delete_payment/")
        self.assertIn(r.status_code, (200, 204), r.content)
        acc = NPGAccount.objects.get(pk=self.acc.id)
        self.assertEqual(acc.status, "active")
        self.assertGreater(float(acc.remaining_balance), 0)
        self.assertFalse(NPGPayment.objects.filter(pk=pid).exists())

    def test_old_close_without_method_fixed_by_admin(self):
        """ปิดบัญชีแบบเก่า (ไม่มีวิธีชำระ → ไม่ลงรายรับ) adm ใส่วิธีชำระแล้วรายรับขึ้น ณ วันที่ปิดบัญชี"""
        from datetime import date, timedelta
        old = NPGPayment.objects.create(account=self.acc, payment_date=date.today() - timedelta(days=5), amount_paid=27000,
                                        installment_number=1, remaining_balance_after=0, payment_method="",
                                        note="ปิดบัญชี - ส่วนลด 3000.0 บาท", created_by=self.staff)
        self.assertEqual(income(old.id), 0)
        r = client_for(self.admin).patch(f"/npg/payments/{old.id}/edit/", {"payment_method": "เงินสด"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(income(old.id), Decimal("27000"))
        e = CashflowEntry.objects.get(auto_source="npg_payment", auto_source_id=old.id)
        self.assertEqual(e.date, old.payment_date)
        self.assertEqual(NPGAccount.objects.get(pk=self.acc.id).status, "closed")

    def test_split_close(self):
        r = self.close(payment_method="แบ่งจ่าย", cash_amount=10000)
        self.assertEqual(r.status_code, 200, r.content)
        rows = CashflowEntry.objects.filter(auto_source="npg_payment", auto_source_id=r.data["payment_id"])
        self.assertEqual(sorted(e.income for e in rows), [Decimal("10000"), Decimal("20000")])
        self.assertEqual(income(r.data["payment_id"]), Decimal("30000"))
