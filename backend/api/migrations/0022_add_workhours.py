from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_fix_chassi_unique_gift_wholesale_pr'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_hour', models.IntegerField(default=8)),
                ('start_minute', models.IntegerField(default=0)),
                ('end_hour', models.IntegerField(default=18)),
                ('end_minute', models.IntegerField(default=0)),
                ('is_enabled', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Work Hours',
            },
        ),
    ]