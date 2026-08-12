from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_npgpayment_method_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='npg_period',
            field=models.CharField(
                blank=True,
                choices=[('รายเดือน', 'รายเดือน'), ('รายปี', 'รายปี')],
                max_length=20,
                null=True,
                verbose_name='รอบชำระ NPG (รายเดือน/รายปี)',
            ),
        ),
    ]