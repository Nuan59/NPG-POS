from django.db import migrations, models


class Migration(migrations.Migration):
    """
    ⚠️ ตาราง api_workhours มีอยู่แล้วจริงในฐานข้อมูล (ถูกสร้างด้วย raw SQL ผ่าน
    /dev/create-workhours/ ไปก่อนหน้านี้) migration นี้แค่ทำให้ Django "รู้จัก"
    โครงสร้างตารางที่มีอยู่แล้ว ไม่ได้สร้างตารางใหม่ซ้ำ (ใช้ SeparateDatabaseAndState
    เพื่อบอก Django ว่า state เปลี่ยน แต่ไม่ต้องรัน SQL จริงกับฐานข้อมูล)
    """

    dependencies = [
        ("api", "0021_bike_old_registration_plate"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="WorkHours",
                    fields=[
                        ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("start_hour", models.IntegerField(default=8)),
                        ("start_minute", models.IntegerField(default=0)),
                        ("end_hour", models.IntegerField(default=18)),
                        ("end_minute", models.IntegerField(default=0)),
                        ("is_enabled", models.BooleanField(default=True)),
                    ],
                    options={
                        "verbose_name": "Work Hours",
                    },
                ),
            ],
            database_operations=[],  # ไม่ต้องรัน SQL จริง เพราะตารางมีอยู่แล้ว
        ),
    ]