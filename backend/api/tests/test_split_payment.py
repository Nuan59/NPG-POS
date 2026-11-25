"""แบ่งจ่าย (เงินสด + โอน): ค่างวด / ปิดบัญชี / ค่าธรรมเนียม / adm แก้ย้อนหลัง - รายรับแยก + ส่งเงินเฉพาะส่วนเงินสด"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from api.models.CashHandover import CashHandoverConfig
from api.models.Cashflow import CashflowEntry

from .helpers import BaseTestCase, client_for, make_npg_account, make_user


def split_of(source, sid):
    rows = CashflowEntry.objects.filter(auto_source=source, auto_source_id=sid)
    return {r.section: r.income for r in rows}


class SplitPaymentTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        CashHandoverConfig.objects.create(start_at=timezone.now() - timedelta(days=1))
        self.staff = make_user("staff", "emp")
        self.admin = make_user("boss", "adm")
        self.acc = make_npg_account(installment_amount=3000)
        self.c = client_for(self.staff)

    def unsent(self):
        return {(r["source"], r["source_id"]): Decimal(str(r["amount"])) for r in self.c.get("/cash-handover/unsent/").data}

    def test_installment_split(self):
        r = self.c.post(f"/npg/accounts/{self.acc.id}/record_payment/", {
            "amount_paid": 3000, "late_fee": 0, "payment_method": "แบ่งจ่าย", "cash_amount": 1000,
            "transfer_bank": "กสิกร"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        pid = r.data["payment_id"]
        self.assertEqual(split_of("npg_payment", pid), {"cash": Decimal("1000"), "transfer": Decimal("2000")})
        self.assertEqual(self.unsent()[("npg_payment", pid)], Decimal("1000"))

    def test_fee_split(self):
        r = self.c.post(f"/npg/accounts/{self.acc.id}/add_fee/", {
            "description": "ค่ายึดรถ", "amount": 1500, "payment_method": "แบ่งจ่าย", "cash_amount": 500,
            "transfer_bank": "SCB"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        fid = r.data["fee_id"]
        self.assertEqual(split_of("npg_fee", fid), {"cash": Decimal("500"), "transfer": Decimal("1000")})
        self.assertEqual(self.unsent()[("npg_fee", fid)], Decimal("500"))
        rec = self.c.get(f"/npg/accounts/{self.acc.id}/fee_receipt/{fid}/").data
        self.assertIn("เงินสด 500", rec["paymentMethodLabel"])
        self.assertIn("SCB", rec["paymentMethodLabel"])

    def test_fee_split_validation(self):
        for cash in (None, 0, 1500, 2000):
            body = {"description": "x", "amount": 1500, "payment_method": "แบ่งจ่าย"}
            if cash is not None:
                body["cash_amount"] = cash
            self.assertEqual(self.c.post(f"/npg/accounts/{self.acc.id}/add_fee/", body, format="json").status_code, 400)

    def test_close_split(self):
        r = self.c.post(f"/npg/accounts/{self.acc.id}/close_account/", {
            "payment_method": "แบ่งจ่าย", "cash_amount": 10000, "transfer_bank": "กสิกร"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(split_of("npg_payment", r.data["payment_id"]),
                         {"cash": Decimal("10000"), "transfer": Decimal("20000")})
        self.assertIn("กสิกร", r.data["receipt"]["paymentMethodLabel"])

    def test_admin_edit_to_split(self):
        pid = self.c.post(f"/npg/accounts/{self.acc.id}/record_payment/", {
            "amount_paid": 3000, "late_fee": 0, "payment_method": "เงินสด"}, format="json").data["payment_id"]
        a = client_for(self.admin)
        self.assertEqual(a.patch(f"/npg/payments/{pid}/edit/", {"payment_method": "แบ่งจ่าย"}, format="json").status_code, 400)
        r = a.patch(f"/npg/payments/{pid}/edit/", {"payment_method": "แบ่งจ่าย", "cash_amount": 1200}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(split_of("npg_payment", pid), {"cash": Decimal("1200"), "transfer": Decimal("1800")})
        r = a.patch(f"/npg/payments/{pid}/edit/", {"payment_method": "เงินโอน"}, format="json")
        self.assertEqual(split_of("npg_payment", pid), {"transfer": Decimal("3000")})
