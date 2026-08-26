from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_bike_old_registration_plate'),
    ]

    operations = [
        migrations.AddField(
            model_name='npgaccount',
            name='account_type',
            field=models.CharField(
                choices=[('finance', 'ไฟแนนซ์'), ('down_payment', 'ผ่อนดาวน์')],
                default='finance',
                max_length=20,
                verbose_name='ประเภทบัญชี',
            ),
        ),
    ]