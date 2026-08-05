from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_bike_old_registration_plate"),
    ]

    operations = [
        migrations.AddField(
            model_name="npgpayment",
            name="payment_method",
            field=models.CharField(blank=True, choices=[("เงินสด", "เงินสด"), ("เงินโอน", "เงินโอน"), ("เช็ค", "เช็ค")], default="", max_length=20),
        ),
        migrations.AddField(
            model_name="npgpayment",
            name="transfer_bank",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="npgpayment",
            name="check_number",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="npgpayment",
            name="edited_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="npg_payments_edited",
                to="api.user",
            ),
        ),
    ]