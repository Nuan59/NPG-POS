"""NPG: ค่าปรับ / รายรับอัตโนมัติ / แก้ย้อนหลังหลังส่งเงิน / ผ่อนดาวน์"""
from decimal import Decimal



from api.models import NPGAccount, NPGPayment
from api.models.Cashflow import CashflowEntry
from api.views.OrderViewSet import create_down_payment_account

from .helpers import BaseTestCase, client_for, make_npg_account, make_order, make_user


def income_of(payment_id):
    return sum((e.income for e in CashflowEntry.objects.filter(auto_source="npg_payment", auto_source_id=payment_id)),
               Decimal("0"))


class LateFeeTests(BaseTestCase):
    def setUp(self):
        self.staff = make_user("staff", "emp")
        self.admin = make_user("boss", "adm")
        # เกินกำหนด 130 วัน → ค่าปรับระบบ 130 x 50 = 6,500
        self.acc = make_npg_account(installment_amount=50000, overdue_days=130)

    def pay(self, **extra):
        body = {"amount_paid": 50000, "payment_method": "เงินสด", **extra}
        return client_for(self.staff).post(f"/npg/accounts/{self.acc.id}/record_payment/", body, format="json")

    def test_system_fee_used_when_not_sent(self):
        r = self.pay()
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["late_fee"], 6500)
        self.assertEqual(income_of(r.data["payment_id"]), Decimal("56500"))

    def test_installment_only_records_50000(self):
        """เคสจริง: รับแค่ค่างวด 50,000 → รายรับต้อง 50,000 ไม่ใช่ 56,500"""
        r = self.pay(late_fee=0)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(income_of(r.data["payment_id"]), Decimal("50000"))
        self.assertEqual(NPGPayment.objects.get(pk=r.data["payment_id"]).late_fee, 0)

    def test_negative_fee_rejected(self):
        self.assertEqual(self.pay(late_fee=-1).status_code, 400)

    def test_admin_fixes_fee_afterwards(self):
        pid = self.pay().data["payment_id"]
        r = client_for(self.admin).patch(f"/npg/payments/{pid}/edit/", {"late_fee": 0}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(income_of(pid), Decimal("50000"))

    def test_staff_cannot_edit_payment(self):
        pid = self.pay().data["payment_id"]
        r = client_for(self.staff).patch(f"/npg/payments/{pid}/edit/", {"late_fee": 0}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_fee_fix_after_handover_shrinks_sent_amount(self):
        from datetime import timedelta
        from django.utils import timezone
        from api.models.CashHandover import CashHandoverConfig
        CashHandoverConfig.objects.create(start_at=timezone.now() - timedelta(days=1))
        pid = self.pay().data["payment_id"]
        r = client_for(self.staff).post("/cash-handover/send-now/",
                                        {"items": [{"source": "npg_payment", "source_id": pid}]}, format="json")
        self.assertIn(r.status_code, (200, 201), r.content)
        # 🔒 ส่งแล้วต้องให้ adm รับก่อน ถึงจะหักลิ้นชัก
        rr = client_for(self.admin).post(f"/cash-handover/{r.data['id']}/receive/", {}, format="json")
        self.assertEqual(rr.status_code, 200, rr.content)
        from api.models.CashHandover import CashHandoverItem
        self.assertEqual(CashHandoverItem.objects.get(source="npg_payment", source_id=pid).amount, Decimal("56500"))

        r = client_for(self.admin).patch(f"/npg/payments/{pid}/edit/", {"late_fee": 0}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(income_of(pid), Decimal("50000"))
        self.assertEqual(CashHandoverItem.objects.get(source="npg_payment", source_id=pid).amount, Decimal("50000"))
        sent = sum((e.sent for e in CashflowEntry.objects.filter(section="cash")), Decimal("0"))
        self.assertEqual(sent, Decimal("50000"))


class DownPaymentTests(BaseTestCase):
    def extra(self, **kw):
        base = {
            "down_payment_installment": True, "down_payment_remaining_balance": 9000,
            "down_payment_installment_count": 3, "down_payment_interest_rate": 0,
            "down_payment_per_remaining_installment": 3000, "down_payment_next_payment_date": "2026-12-20",
        }
        base.update(kw)
        return base

    def test_creates_account(self):
        order = make_order(finance_provider="Cathay", checkout_extra=self.extra())
        acc, msg = create_down_payment_account(order)
        self.assertIsNone(msg)
        self.assertEqual(acc.account_type, "down_payment")
        self.assertEqual(float(acc.remaining_balance), 9000)

    def test_missing_data_explains_why(self):
        order = make_order(finance_provider="Cathay", checkout_extra=self.extra(down_payment_installment_count=0))
        acc, msg = create_down_payment_account(order)
        self.assertIsNone(acc)
        self.assertIn("จำนวนงวด", msg)

    def test_npg_finance_refused(self):
        order = make_order(finance_provider="NPG", checkout_extra=self.extra())
        self.assertIsNone(create_down_payment_account(order)[0])

    def test_no_duplicate(self):
        order = make_order(finance_provider="Cathay", checkout_extra=self.extra())
        create_down_payment_account(order)
        acc, msg = create_down_payment_account(order)
        self.assertIsNone(acc)
        self.assertEqual(NPGAccount.objects.filter(order=order).count(), 1)

    def test_admin_backfill_endpoint(self):
        order = make_order(finance_provider="Cathay", sale_status="completed",
                           checkout_extra=self.extra(down_payment_per_remaining_installment=0))
        admin = make_user("boss", "adm")
        c = client_for(admin)
        self.assertEqual(c.get(f"/order/{order.id}/down_payment/").data["account_id"], None)
        self.assertEqual(c.post(f"/order/{order.id}/down_payment/", {}, format="json").status_code, 400)
        r = c.post(f"/order/{order.id}/down_payment/", {"per_installment": 3000}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(NPGAccount.objects.filter(order=order, account_type="down_payment").exists())

    def test_staff_cannot_backfill(self):
        order = make_order(finance_provider="Cathay", sale_status="completed", checkout_extra=self.extra())
        r = client_for(make_user()).post(f"/order/{order.id}/down_payment/", {}, format="json")
        self.assertEqual(r.status_code, 403)
