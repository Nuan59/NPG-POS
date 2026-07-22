from django.db import migrations, models


class Migration(migrations.Migration):

    # ⚠️ เปลี่ยนเป็นชื่อ migration ล่าสุดจริงในโฟลเดอร์ api/migrations/ แล้วเปลี่ยนชื่อไฟล์นี้เป็นเลขถัดไป
    dependencies = [
        ("api", "0027_xxxx_เปลี่ยนเป็นชื่อ_migration_ล่าสุดจริง"),
    ]

    operations = [
        migrations.CreateModel(
            name="CashflowEntry",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("section", models.CharField(choices=[("cash", "เงินสด"), ("transfer", "โอน")], max_length=10)),
                ("seq", models.PositiveIntegerField(default=0)),
                ("description", models.CharField(blank=True, default="", max_length=255)),
                ("income", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("sent", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("expense", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("change", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("deposit_return", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("created_by", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "cashflow_entry", "ordering": ["date", "section", "seq"]},
        ),
        migrations.CreateModel(
            name="CashflowDayMeta",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(unique=True)),
                ("cash_opening_override", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("transfer_opening_override", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("checker_name", models.CharField(blank=True, default="", max_length=255)),
                ("checker_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "cashflow_day_meta"},
        ),
        migrations.AddIndex(
            model_name="cashflowentry",
            index=models.Index(fields=["date", "section"], name="cashflow_entry_date_section_idx"),
        ),
    ]
