from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_fix_chassi_unique_gift_wholesale_price'),
    ]

    operations = [
        # เพิ่ม chassi unique constraint (ข้ามถ้ามีอยู่แล้ว)
        migrations.RunSQL(
            sql="""
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'api_bike_chassi_key' 
                        OR conname = 'api_bike_chassi_08e211ac_uniq'
                    ) THEN
                        ALTER TABLE api_bike ADD CONSTRAINT api_bike_chassi_unique UNIQUE (chassi);
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # เพิ่ม old_registration_plate ใน Bike (ข้ามถ้ามีอยู่แล้ว)
        migrations.RunSQL(
            sql="""
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='api_bike' AND column_name='old_registration_plate'
                    ) THEN
                        ALTER TABLE api_bike ADD COLUMN old_registration_plate varchar(20) NULL;
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]