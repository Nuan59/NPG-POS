"""ใบกำกับภาษีซื้อ (นำเข้า) + สรุปภาษี: พนักงานบันทึกได้ / เห็นเฉพาะของตัวเอง / adm ยกเลิก / สรุปเฉพาะ adm"""
from datetime import date

from api.models import Bike

from .helpers import BaseTestCase, client_for, make_order, make_user


class InputTaxTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff", "emp")
        self.staff.permissions = {"sale": True}
        self.staff.save()
        self.staff2 = make_user("staff2", "emp")
        self.admin = make_user("boss", "adm")
        self.mon = make_user("checker", "mon")
        self.today = date.today()

    def add(self, client=None, **kw):
        body = {"invoice_date": self.today.isoformat(), "supplier_name": "บริษัท ไทยยามาฮ่า จำกัด",
                "supplier_tax_id": "0105536000000", "invoice_no": "IV-001", "amount": 42800, **kw}
        return (client or client_for(self.staff)).post("/input-tax-invoices/", body, format="json")

    def test_staff_records_vat_backed_out(self):
        r = self.add()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.data["base_amount"], r.data["vat_amount"]), (40000.0, 2800.0))
        self.assertEqual((r.data["tax_year"], r.data["tax_month"]), (self.today.year, self.today.month))
        # VAT ตามใบ
        r2 = self.add(invoice_no="IV-002", amount=1000, vat_amount=65.42)
        self.assertEqual(r2.data["vat_amount"], 65.42)

    def test_duplicate_and_validation(self):
        self.add()
        self.assertEqual(self.add().status_code, 409)
        self.assertEqual(self.add(invoice_no="X1", supplier_tax_id="123").status_code, 400)
        self.assertEqual(self.add(invoice_no="X2", amount=0).status_code, 400)
        self.assertEqual(self.add(invoice_no="X3", invoice_date="2999-01-01").status_code, 400)
        self.assertEqual(self.add(invoice_no="X4", vat_amount=50000).status_code, 400)
        self.assertEqual(self.add(invoice_no="X5", tax_month=1, tax_year=2000).status_code, 400)

    def test_staff_sees_only_own(self):
        self.add()
        self.add(client_for(self.staff2), invoice_no="IV-OTHER")
        mine = client_for(self.staff).get("/input-tax-invoices/", {"year": self.today.year}).data["invoices"]
        self.assertEqual([r["invoice_no"] for r in mine], ["IV-001"])
        allr = client_for(self.admin).get("/input-tax-invoices/", {"year": self.today.year}).data["invoices"]
        self.assertEqual(len(allr), 2)
        self.assertEqual(self.add(client_for(self.mon), invoice_no="M").status_code, 403)
        # adm ปิดสิทธิ์บันทึกใบกำกับภาษีซื้อรายคน
        self.staff2.permissions = {"input_tax": False}
        self.staff2.save()
        self.assertEqual(self.add(client_for(self.staff2), invoice_no="N").status_code, 403)

    def test_cancel_adm_only(self):
        inv = self.add().data
        self.assertEqual(client_for(self.staff).post(f"/input-tax-invoices/{inv['id']}/cancel/", {"reason": "x"}, format="json").status_code, 403)
        r = client_for(self.admin).post(f"/input-tax-invoices/{inv['id']}/cancel/", {"reason": "บันทึกซ้ำ"}, format="json")
        self.assertEqual((r.status_code, r.data["status"]), (200, "cancelled"))
        self.assertEqual(self.add().status_code, 201)  # ยกเลิกแล้วบันทึกใหม่ได้

    def test_summary_adm_only(self):
        order = make_order()
        order.bikes.add(Bike.objects.create(model_name="Wave", model_code="W", chassi="CH-S", sold=True))
        s = client_for(self.staff).post("/tax-invoices/", {"order": order.id, "amount": 53500}, format="json")
        self.assertEqual(s.status_code, 201, s.content)  # ภาษีขาย 3,500
        self.add()  # ภาษีซื้อ 2,800
        self.assertEqual(client_for(self.staff).get("/tax-summary/").status_code, 403)
        r = client_for(self.admin).get("/tax-summary/", {"year": self.today.year, "month": self.today.month})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.data["sales"]["vat"], r.data["purchases"]["vat"], r.data["net_vat"]), (3500.0, 2800.0, 700.0))
        self.assertEqual(client_for(self.mon).get("/tax-summary/").status_code, 403)  # 🔒 เฉพาะ adm
        y = client_for(self.admin).get("/tax-summary/", {"year": self.today.year}).data
        self.assertEqual(len(y["by_month"]), 12)
        self.assertEqual(y["net_vat"], 700.0)
        other = client_for(self.admin).get("/tax-summary/", {"year": self.today.year - 1}).data
        self.assertEqual(other["net_vat"], 0)
