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
        # เพิ่ม wholesale_price ใน Gift (ข้ามถ้ามีอยู่แล้ว)
        migrations.RunSQL(
            sql="DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_gift' AND column_name='wholesale_price') THEN ALTER TABLE api_gift ADD COLUMN wholesale_price integer NULL; END IF; END $$;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]