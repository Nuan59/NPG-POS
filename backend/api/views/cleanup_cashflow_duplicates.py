# cleanup_cashflow_duplicates.py
# วางไฟล์นี้ใน: backend/api/views/ (หรือโฟลเดอร์ dev views เดิมที่มี add_npg_late_fee_column)
# แล้ว register path ใน urls.py เช่น:
#   path('dev/cleanup-cashflow-duplicates/', cleanup_cashflow_duplicates),
#
# เรียกผ่าน browser: https://<backend-url>/dev/cleanup-cashflow-duplicates/?date=YYYY-MM-DD
#
# ลบรายการ cashflow ที่ "ข้อมูลเหมือนกันทุก field" ในวันเดียวกัน เหลือไว้แค่ 1 รายการ
# (เอาอันที่ id น้อยสุด/ถูกสร้างก่อน) ใช้ raw SQL เพราะจำนวนซ้ำอาจมีหลักแสน-ล้านแถว
# ทำผ่าน Django ORM ทีละแถวจะช้าเกินไป
from django.http import JsonResponse
from django.db import connection


def cleanup_cashflow_duplicates(request):
    date_str = request.GET.get("date")
    if not date_str:
        return JsonResponse({"error": "ต้องระบุ ?date=YYYY-MM-DD"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM cashflow_entry WHERE date = %s", [date_str])
        before_count = cursor.fetchone()[0]

        cursor.execute(
            """
            DELETE FROM cashflow_entry
            WHERE date = %s
            AND id NOT IN (
                SELECT MIN(id) FROM cashflow_entry
                WHERE date = %s
                GROUP BY section, description, income, sent, expense, change, deposit_return, cash_in, created_by
            )
            """,
            [date_str, date_str],
        )
        deleted_count = cursor.rowcount

        cursor.execute("SELECT COUNT(*) FROM cashflow_entry WHERE date = %s", [date_str])
        after_count = cursor.fetchone()[0]

    return JsonResponse({
        "status": "ok",
        "date": date_str,
        "before": before_count,
        "deleted": deleted_count,
        "after": after_count,
    })