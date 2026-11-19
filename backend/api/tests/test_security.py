"""ความปลอดภัย: API ต้องล็อกอิน / หน้า /dev/ เฉพาะ adm"""
import os
from unittest import mock



from .helpers import BaseTestCase, client_for, make_user


class ApiRequiresLoginTests(BaseTestCase):
    PRIVATE = [
        "/npg/accounts/", "/npg/payments/", "/customers/", "/cashflow/day/?date=2026-01-01",
        "/tasks/posts/", "/order/registration_expiring/", "/activity-logs/",
    ]

    def test_anonymous_gets_401(self):
        c = client_for(None)
        for url in self.PRIVATE:
            with self.subTest(url=url):
                self.assertEqual(c.get(url).status_code, 401)

    def test_logged_in_staff_can_read_npg(self):
        self.assertEqual(client_for(make_user()).get("/npg/accounts/").status_code, 200)

    def test_anonymous_cannot_write_cashflow(self):
        r = client_for(None).post("/cashflow/save_day/", {"date": "2026-01-01", "cashRows": []}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_postal_code_lookup_stays_public(self):
        self.assertNotEqual(client_for(None).get("/postal-code/?code=10100").status_code, 401)


class DevToolsGuardTests(BaseTestCase):
    def test_anonymous_sees_404(self):
        self.assertEqual(client_for(None).get("/dev/chassis/").status_code, 404)

    def test_staff_sees_404(self):
        self.assertEqual(client_for(make_user("emp1", "emp")).get("/dev/chassis/").status_code, 404)

    def test_admin_token_allowed(self):
        self.assertEqual(client_for(make_user("boss", "adm")).get("/dev/chassis/").status_code, 200)

    def test_key_allowed_only_when_matching(self):
        with mock.patch.dict(os.environ, {"DEV_TOOLS_KEY": "s3cret"}):
            c = client_for(None)
            self.assertEqual(c.get("/dev/chassis/?key=wrong").status_code, 404)
            self.assertEqual(c.get("/dev/chassis/?key=s3cret").status_code, 200)

    def test_empty_key_env_never_matches(self):
        with mock.patch.dict(os.environ, {"DEV_TOOLS_KEY": ""}):
            self.assertEqual(client_for(None).get("/dev/chassis/?key=").status_code, 404)
