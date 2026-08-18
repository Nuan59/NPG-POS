from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_order_npg_period'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='permissions',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]