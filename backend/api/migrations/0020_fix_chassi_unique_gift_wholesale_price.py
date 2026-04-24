from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_remove_bike_chassis_bike_chassi_alter_bike_brand'),
    ]

    operations = [
        # ข้าม unique constraint ที่มีอยู่แล้วใน DB
        migrations.RunSQL(
            sql="DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'api_bike_chassi_08e211ac_uniq') THEN ALTER TABLE api_bike ADD CONSTRAINT api_bike_chassi_08e211ac_uniq UNIQUE (chassi); END IF; END $$;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # เพิ่ม wholesale_price ใน Gift
        migrations.AddField(
            model_name='gift',
            name='wholesale_price',
            field=models.IntegerField(blank=True, null=True, verbose_name='ขายส่ง'),
        ),
    ]