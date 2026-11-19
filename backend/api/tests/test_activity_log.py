"""บันทึกการทำงานของพนักงาน"""
from django.db import connection


from api import activity

from .helpers import BaseTestCase, client_for, make_npg_account, make_user


def logs():
    activity.ensure_table()
    with connection.cursor() as c:
        c.execute(f"SELECT username, action, detail, payload, status FROM {activity.TABLE} ORDER BY id")
        return c.fetchall()


class ActivityLogTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("somchai", "emp", name="สมชาย")
        self.admin = make_user("boss", "adm")

    def test_cashflow_add_is_logged_with_detail(self):
        r = client_for(self.staff).post("/cashflow/save_day/", {
            "date": "2026-11-18",
            "cashRows": [{"description": "ค่าน้ำมัน", "expense": 300}], "transferRows": [],
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        rows = logs()
        self.assertEqual(len(rows), 1)
        username, action, detail, payload, status = rows[0]
        self.assertEqual((username, action, status), ("somchai", "บันทึกรายรับ-รายจ่าย", 200))
        self.assertIn("เพิ่ม: ค่าน้ำมัน รายจ่าย 300", detail)

    def test_autosave_without_change_not_logged(self):
        client_for(self.staff).post("/cashflow/save_day/", {"date": "2026-11-18", "cashRows": [], "transferRows": []},
                                    format="json")
        self.assertEqual(logs(), [])

    def test_npg_edit_logs_before_after(self):
        acc = make_npg_account(overdue_days=130)
        pid = client_for(self.staff).post(f"/npg/accounts/{acc.id}/record_payment/",
                                          {"amount_paid": 50000, "payment_method": "เงินสด"}, format="json").data["payment_id"]
        client_for(self.admin).patch(f"/npg/payments/{pid}/edit/", {"late_fee": 0}, format="json")
        details = [d for _, a, d, _, _ in logs() if a == "แก้ไขรายการชำระ NPG"]
        self.assertEqual(len(details), 1)
        self.assertIn("ค่าปรับ 6,500 → 0", details[0])

    def test_failed_attempt_logged(self):
        client_for(self.staff).patch("/npg/payments/999/edit/", {"late_fee": 0}, format="json")
        self.assertEqual(logs()[0][4], 403)

    def test_passwords_never_stored(self):
        client_for(None).post("/login/", {"username": "somchai", "password": "pw12345"}, format="json")
        client_for(self.admin).post("/employees/", {"username": "new", "password": "TopSecret99", "name": "x", "role": "emp"},
                                    format="json")
        for row in logs():
            self.assertNotIn("TopSecret99", row[3])
            self.assertNotIn("pw12345", row[3])

    def test_login_logged_by_username(self):
        client_for(None).post("/login/", {"username": "somchai", "password": "wrong"}, format="json")
        self.assertEqual(logs()[0][:2], ("somchai", "เข้าสู่ระบบไม่สำเร็จ"))

    def test_only_admin_and_monitor_can_view(self):
        self.assertEqual(client_for(self.staff).get("/activity-logs/").status_code, 403)
        self.assertEqual(client_for(self.admin).get("/activity-logs/").status_code, 200)
        self.assertEqual(client_for(make_user("mon1", "mon")).get("/activity-logs/").status_code, 200)

    def test_filters(self):
        client_for(self.staff).post("/cashflow/save_day/", {
            "date": "2026-11-18", "cashRows": [{"description": "ค่าไฟ", "expense": 900}], "transferRows": [],
        }, format="json")
        c = client_for(self.admin)
        self.assertEqual(c.get("/activity-logs/?q=ค่าไฟ").data["total"], 1)
        self.assertEqual(c.get(f"/activity-logs/?user_id={self.admin.id}").data["total"], 0)
        self.assertEqual(c.get("/activity-logs/users/").data[0]["username"], "somchai")
