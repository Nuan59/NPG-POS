"""ส่งเงิน: ทุกครั้งต้องมีคนรับ = adm / ผู้ตรวจสอบ-พนักงาน รับไม่ได้ / พนักงานพิมพ์ส่งเงินเองไม่ได้"""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from api.models.CashHandover import CashHandover, CashHandoverConfig
from api.models.Cashflow import CashflowEntry

from .helpers import BaseTestCase, client_for, make_npg_account, make_user


def drawer_sent():
    return sum((e.sent for e in CashflowEntry.objects.filter(section="cash")), Decimal("0"))


class HandoverNeedsAdmTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        CashHandoverConfig.objects.create(start_at=timezone.now() - timedelta(days=1))
        self.staff = make_user("staff", "emp")
        self.mon = make_user("checker", "mon")
        self.admin = make_user("boss", "adm")
        acc = make_npg_account(installment_amount=3000)
        p = client_for(self.staff).post(f"/npg/accounts/{acc.id}/record_payment/",
                                        {"amount_paid": 3000, "payment_method": "เงินสด", "late_fee": 0}, format="json")
        self.pid = p.data["payment_id"]

    def send(self, **item):
        r = client_for(self.staff).post("/cash-handover/send-now/",
                                        {"items": [{"source": "npg_payment", "source_id": self.pid, **item}]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.data

    def test_send_waits_for_adm(self):
        h = self.send()
        self.assertEqual(h["status"], "pending")
        self.assertFalse(h["received_by"])
        self.assertEqual(drawer_sent(), 0)  # ยังไม่หักลิ้นชัก

    def test_staff_and_monitor_cannot_receive(self):
        h = self.send()
        for u in (self.staff, self.mon):
            r = client_for(u).post(f"/cash-handover/{h['id']}/receive/", {}, format="json")
            self.assertEqual(r.status_code, 403)
        self.assertEqual(CashHandover.objects.get(pk=h["id"]).status, "pending")

    def test_adm_receive_deducts_drawer_and_records_receiver(self):
        h = self.send(amount=2000)  # ส่งไม่เต็ม
        r = client_for(self.admin).post(f"/cash-handover/{h['id']}/receive/", {}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        obj = CashHandover.objects.get(pk=h["id"])
        self.assertEqual((obj.status, obj.received_by), ("received", "boss"))
        self.assertEqual(drawer_sent(), Decimal("2000"))
        row = CashflowEntry.objects.get(auto_source="handover")
        self.assertIn("staff → boss", row.created_by)

    def test_adm_unreceive_returns_money(self):
        h = self.send()
        client_for(self.admin).post(f"/cash-handover/{h['id']}/receive/", {}, format="json")
        r = client_for(self.admin).post(f"/cash-handover/{h['id']}/unreceive/", {}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(drawer_sent(), 0)
        self.assertEqual(CashHandover.objects.get(pk=h["id"]).status, "pending")

    def test_staff_cannot_type_sent_row(self):
        today = timezone.localdate().isoformat()
        body = {"date": today, "cashRows": [{"description": "ส่งเงินเอง", "sent": 500}], "transferRows": []}
        r = client_for(self.staff).post("/cashflow/save_day/", body, format="json")
        self.assertEqual(r.status_code, 403, r.content)
        self.assertEqual(drawer_sent(), 0)
        # adm พิมพ์เองได้ (กรณีพิเศษ)
        r = client_for(self.admin).post("/cashflow/save_day/", body, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(drawer_sent(), Decimal("500"))

    def test_staff_normal_income_row_still_ok(self):
        today = timezone.localdate().isoformat()
        r = client_for(self.staff).post("/cashflow/save_day/", {
            "date": today, "cashRows": [{"description": "ขายของ", "income": 100}], "transferRows": []}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
