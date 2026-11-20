"""สต็อกอะไหล่: รับเข้า / ทุนเฉลี่ย / ใช้ในงานซ่อม / ขายหน้าร้าน / คืนสต็อก / ของไม่พอ / ปิดทุน"""
from decimal import Decimal

from api.models.Cashflow import CashflowEntry
from api.models.Parts import Part, PartMovement
from api.models.ServiceRecord import ServiceRecord

from .helpers import BaseTestCase, client_for, make_customer, make_user
from api.models import Bike


class PartsTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff", "emp")
        self.admin = make_user("boss", "adm")
        self.c = client_for(self.staff)
        r = self.c.post("/parts/", {"name": "ผ้าเบรกหน้า", "code": "BRK-1", "price": 250, "min_qty": 2,
                                    "start_qty": 10, "unit_cost": 100}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.part_id = r.data["id"]

    def part(self):
        return Part.objects.get(pk=self.part_id)

    def test_start_qty_creates_receive_movement(self):
        self.assertEqual(self.part().qty, Decimal("10"))
        self.assertEqual(PartMovement.objects.filter(part_id=self.part_id, kind="in").count(), 1)

    def test_receive_average_cost_and_cash_expense(self):
        r = self.c.post(f"/parts/{self.part_id}/receive/", {"qty": 10, "unit_cost": 120, "pay_cash": True,
                                                            "supplier": "ร้านอะไหล่ A"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        p = self.part()
        self.assertEqual(p.qty, Decimal("20"))
        self.assertEqual(p.cost, Decimal("110.00"))
        e = CashflowEntry.objects.get(auto_source="part_in")
        self.assertEqual((e.section, e.expense), ("cash", Decimal("1200.00")))

    def test_cost_hidden_from_staff(self):
        self.assertNotIn("cost", self.c.get(f"/parts/{self.part_id}/").data)
        self.assertIn("cost", client_for(self.admin).get(f"/parts/{self.part_id}/").data)

    def _service(self, **kw):
        body = {"transaction_type": "ซ่อม", "customer": make_customer().id, "payment_type": "เงินสด",
                "items": [{"description": "ผ้าเบรกหน้า", "amount": 500, "part_id": self.part_id, "qty": 2},
                          {"description": "ค่าแรง", "amount": 100}]}
        bike = Bike.objects.create(model_name="Wave", model_code="W1", chassi="CH-1", sold=True)
        body["bike"] = bike.id
        body.update(kw)
        return self.c.post("/service/", body, format="json")

    def test_service_uses_parts_and_delete_returns_them(self):
        r = self._service()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.part().qty, Decimal("8"))
        mv = PartMovement.objects.get(kind="service")
        self.assertEqual((mv.qty, mv.unit_price, mv.ref_id), (Decimal("-2"), Decimal("250.00"), r.data["data"]))
        self.assertEqual(ServiceRecord.objects.get(pk=r.data["data"]).total, 600)

        d = client_for(self.admin).delete(f"/service/{r.data['data']}/")
        self.assertIn(d.status_code, (200, 204), d.content)
        self.assertEqual(self.part().qty, Decimal("10"))

    def test_not_enough_stock_rolls_back_everything(self):
        r = self._service(items=[{"description": "ผ้าเบรกหน้า", "amount": 2750, "part_id": self.part_id, "qty": 11}])
        self.assertEqual(r.status_code, 400)
        self.assertIn("ไม่พอ", r.data["error"])
        self.assertEqual(ServiceRecord.objects.count(), 0)
        self.assertEqual(self.part().qty, Decimal("10"))

    def test_counter_sale_without_customer_or_bike(self):
        r = self.c.post("/service/", {"transaction_type": "ขายอะไหล่", "payment_type": "เงินสด",
                                      "items": [{"description": "ผ้าเบรกหน้า", "amount": 250, "part_id": self.part_id, "qty": 1}]},
                        format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.part().qty, Decimal("9"))
        self.assertEqual(PartMovement.objects.get(ref_id=r.data["data"]).kind, "sale")
        income = CashflowEntry.objects.get(auto_source="service", auto_source_id=r.data["data"])
        self.assertEqual(income.income, Decimal("250.00"))
        self.assertIn("ลูกค้าหน้าร้าน", income.description)

    def test_repair_still_requires_bike(self):
        r = self.c.post("/service/", {"transaction_type": "ซ่อม", "customer": make_customer().id, "payment_type": "เงินสด",
                                      "items": [{"description": "ค่าแรง", "amount": 100}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_low_stock_filter_and_adjust(self):
        self.assertEqual(len(self.c.get("/parts/?low=1").data), 0)
        self.assertEqual(self.c.post(f"/parts/{self.part_id}/adjust/", {"qty": 1, "reason": "นับสต็อก"}, format="json").status_code, 403)
        r = client_for(self.admin).post(f"/parts/{self.part_id}/adjust/", {"qty": 1, "reason": "นับสต็อก"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(self.c.get("/parts/?low=1").data), 1)
        self.assertEqual(PartMovement.objects.get(kind="adjust").qty, Decimal("-9"))


class PageViewLogTests(BaseTestCase):
    def test_page_view_logged_once(self):
        from .test_activity_log import logs
        u = make_user("somchai", "emp")
        r = client_for(u).post("/activity-logs/view/", {"path": "/npg", "title": "NPG"}, format="json")
        self.assertEqual(r.status_code, 200)
        rows = logs()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][:2], ("somchai", "เปิดหน้า NPG"))

    def test_views_can_be_hidden(self):
        u = make_user("somchai", "emp")
        client_for(u).post("/activity-logs/view/", {"path": "/npg", "title": "NPG"}, format="json")
        a = client_for(make_user("boss", "adm"))
        self.assertEqual(a.get("/activity-logs/").data["total"], 1)
        self.assertEqual(a.get("/activity-logs/?views=0").data["total"], 0)


class CostCodeTests(BaseTestCase):
    def test_decode_encode(self):
        from api.parts import decode_cost, encode_cost, StockError
        self.assertEqual(decode_cost("NOWTT"), Decimal("14500"))
        self.assertEqual(decode_cost("ntt"), Decimal("100"))
        self.assertEqual(encode_cost(Decimal("112.40")), "NNC")
        with self.assertRaises(StockError):
            decode_cost("NX1")

    def test_receive_with_code_and_cost_never_sent_to_staff(self):
        staff, admin = make_user("staff", "emp"), make_user("boss", "adm")
        c = client_for(staff)
        pid = c.post("/parts/", {"name": "หัวเทียน", "price": 90, "start_qty": 10, "unit_cost_code": "WW"},
                     format="json").data["id"]
        self.assertEqual(Part.objects.get(pk=pid).cost, Decimal("55.00"))
        r = c.post(f"/parts/{pid}/receive/", {"qty": 10, "unit_cost_code": "MW"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Part.objects.get(pk=pid).cost, Decimal("60.00"))
        self.assertNotIn("cost", r.data["part"])              # ตัวเลขทุนไม่ส่งให้พนักงาน
        self.assertEqual(r.data["part"]["cost_code"], "MT")     # ได้แค่โค้ด (ใช้ในกล่องรายการสั่งซื้อ)
        self.assertTrue(all("unit_cost" not in m for m in c.get(f"/parts/{pid}/movements/").data))
        self.assertEqual(client_for(admin).get(f"/parts/{pid}/").data["cost_code"], "MT")
        self.assertEqual(c.post(f"/parts/{pid}/receive/", {"qty": 1, "unit_cost_code": "1A"}, format="json").status_code, 400)
