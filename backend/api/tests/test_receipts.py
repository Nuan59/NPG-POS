"""ทะเบียนใบเสร็จชั่วคราว: ออกทุกครั้งที่รับเงิน (ยกเว้นขายรถ) / ลบแล้วไม่หาย แค่ยกเลิก / adm เห็นใบยกเลิก"""
from api.models import Bike

from .helpers import BaseTestCase, client_for, make_customer, make_npg_account, make_user


class ReceiptRegisterTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff", "emp")
        self.admin = make_user("boss", "adm")
        self.c = client_for(self.staff)
        self.a = client_for(self.admin)

    def numbers(self, client=None, **q):
        r = (client or self.a).get("/receipts/", q)
        self.assertEqual(r.status_code, 200, r.content)
        return {x["number"]: x for x in r.data["results"]}, r.data

    def test_service_issues_receipt_and_delete_cancels(self):
        bike = Bike.objects.create(model_name="Wave", model_code="W1", chassi="CH-9", sold=True)
        r = self.c.post("/service/", {"transaction_type": "อื่นๆ", "transaction_type_detail": "เปลี่ยนถ่ายน้ำมันเครื่อง", "customer": make_customer().id,
                                      "bike": bike.id, "payment_type": "เงินสด",
                                      "items": [{"description": "น้ำมันเครื่อง", "amount": 350}]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        num = f"S-{r.data['data']:08d}"
        rows, _ = self.numbers(self.c)
        self.assertEqual((rows[num]["amount"], rows[num]["category"]), (350, "เปลี่ยนถ่ายน้ำมันเครื่อง"))
        self.assertEqual(rows[num]["link"], f"/service-history/{r.data['data']}/TempReceipt")
        self.assertIn(num, self.numbers(bike=bike.id)[0])

        self.a.delete(f"/service/{r.data['data']}/")
        self.assertNotIn(num, self.numbers(self.c)[0])  # พนักงานไม่เห็นใบยกเลิก
        rows, data = self.numbers(status="cancelled")
        self.assertEqual(rows[num]["cancelled_by"], "boss")
        self.assertEqual(rows[num]["status"], "cancelled")
        self.assertIn("amount_sum", data)
        _, staff_data = self.numbers(self.c, status="cancelled")
        self.assertNotIn("amount_sum", staff_data)
        self.assertEqual(staff_data["total"], 0)

    def test_npg_payment_and_fee(self):
        acc = make_npg_account(installment_amount=3000)
        p = self.c.post(f"/npg/accounts/{acc.id}/record_payment/",
                        {"amount_paid": 3000, "payment_method": "เงินสด", "late_fee": 0}, format="json")
        self.assertEqual(p.status_code, 200, p.content)
        f = self.c.post(f"/npg/accounts/{acc.id}/add_fee/",
                        {"description": "ค่าโอนรถ", "amount": 500, "payment_method": "เงินโอน"}, format="json")
        self.assertEqual(f.status_code, 200, f.content)
        fid = f.data["fee_id"]
        rows, _ = self.numbers(self.c, kind="npg_fee")
        self.assertEqual(rows[f"MF-{fid:05d}"]["amount"], 500)
        self.assertIn(f"MO-{p.data['payment_id']:05d}", self.numbers(kind="npg_payment")[0])

        rec = self.c.get(f"/npg/accounts/{acc.id}/fee_receipt/{fid}/")
        self.assertEqual(rec.status_code, 200, rec.content)
        self.assertEqual((rec.data["receiptNumber"], rec.data["total"]), (f"MF-{fid:05d}", 500))

        self.a.delete(f"/npg/payments/{p.data['payment_id']}/delete_payment/")
        self.assertIn(f"MO-{p.data['payment_id']:05d}", self.numbers(status="cancelled")[0])

    def test_search_and_login_required(self):
        from rest_framework.test import APIClient
        self.assertEqual(APIClient().get("/receipts/").status_code, 401)
        self.assertEqual(self.a.get("/receipts/", {"date_from": "bad"}).status_code, 400)
