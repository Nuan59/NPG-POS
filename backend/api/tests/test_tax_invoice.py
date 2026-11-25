"""ใบกำกับภาษี: ถอด VAT จากราคาสุทธิ / เลขรันต่อเนื่อง / 1 ขาย 1 ใบ / ยกเลิกเฉพาะ adm เลขไม่ใช้ซ้ำ / สิทธิ์"""
from decimal import Decimal

from api import tax_invoices
from api.models import Bike

from .helpers import BaseTestCase, client_for, make_order, make_user


class TaxInvoiceTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff", "emp")
        self.staff.permissions = {"sale": True}
        self.staff.save()
        self.admin = make_user("boss", "adm")
        self.order = make_order()
        self.order.sale_price = 50000
        self.order.discount = 1000
        self.order.save()
        self.order.bikes.add(Bike.objects.create(model_name="Wave 110i", model_code="AFS110", chassi="CH-TAX", sold=True))
        self.c = client_for(self.staff)

    def issue(self, client=None, **kw):
        return (client or self.c).post("/tax-invoices/", {"order": self.order.id, **kw}, format="json")

    def test_split_vat(self):
        self.assertEqual(tax_invoices.split_vat(49000), (Decimal("49000.00"), Decimal("45794.39"), Decimal("3205.61")))
        a, b, v = tax_invoices.split_vat(107)
        self.assertEqual((b, v), (Decimal("100.00"), Decimal("7.00")))

    def test_defaults_and_issue(self):
        d = self.c.get("/tax-invoices/", {"order": self.order.id}).data
        self.assertEqual(d["defaults"]["amount"], 49000)  # ราคารถหลังหักส่วนลด
        self.assertTrue(d["can_issue"])
        self.assertFalse(d["can_cancel"])
        self.assertIn("Wave 110i", d["defaults"]["item_description"])
        r = self.issue()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data["number"], "INV-000001")
        self.assertEqual((r.data["base_amount"], r.data["vat_amount"]), (45794.39, 3205.61))
        self.assertEqual(r.data["issued_by"], "staff")
        self.assertEqual(r.data["buyer_name"], "ลูกค้าทดสอบ")

    def test_one_active_per_sale_and_cancel_keeps_number(self):
        first = self.issue().data
        self.assertEqual(self.issue().status_code, 409)
        self.assertEqual(self.c.post(f"/tax-invoices/{first['id']}/cancel/", {"reason": "ผิด"}, format="json").status_code, 403)
        a = client_for(self.admin)
        self.assertEqual(a.post(f"/tax-invoices/{first['id']}/cancel/", {}, format="json").status_code, 400)
        r = a.post(f"/tax-invoices/{first['id']}/cancel/", {"reason": "ชื่อผิด"}, format="json")
        self.assertEqual((r.status_code, r.data["status"], r.data["cancelled_by"]), (200, "cancelled", "boss"))
        second = self.issue(amount=48000, buyer_name="บริษัท ทดสอบ จำกัด", buyer_tax_id="0105555555555",
                            buyer_branch="สำนักงานใหญ่", receiver_name="นายรับ แทนบริษัท").data
        self.assertEqual(second["receiver_name"], "นายรับ แทนบริษัท")
        self.assertEqual(second["buyer_name"], "บริษัท ทดสอบ จำกัด")
        self.assertEqual(second["number"], "INV-000002")  # ไม่เอาเลขที่ยกเลิกมาใช้ซ้ำ
        self.assertEqual(second["amount"], 48000)
        invs = self.c.get("/tax-invoices/", {"order": self.order.id}).data["invoices"]
        self.assertEqual([i["status"] for i in invs], ["active", "cancelled"])

    def test_numbers_run_across_sales(self):
        self.issue()
        other = make_order()
        r = self.c.post("/tax-invoices/", {"order": other.id, "amount": 1070}, format="json")
        self.assertEqual(r.data["number"], "INV-000002")

    def test_permission(self):
        self.staff.permissions = {"sale": True, "tax_invoice": False}
        self.staff.save()
        self.assertEqual(self.issue().status_code, 403)
        nosale = make_user("other", "emp")
        self.assertEqual(self.issue(client_for(nosale)).status_code, 403)
        mon = make_user("checker", "mon")
        self.assertEqual(self.issue(client_for(mon)).status_code, 403)
        self.assertEqual(self.issue(client_for(self.admin)).status_code, 201)

    def test_validation(self):
        self.assertEqual(self.issue(amount=0).status_code, 400)
        self.assertEqual(self.issue(buyer_tax_id="123").status_code, 400)
        self.assertEqual(self.issue(issue_date="2999-01-01").status_code, 400)
        self.assertEqual(self.issue(buyer_name="").status_code, 400)
