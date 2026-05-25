from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_fix_chassi_unique_gift_wholesale_pr'),
        ('api', '0021_bike_old_registration_plate'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS api_workhours (
                id SERIAL PRIMARY KEY,
                start_hour INTEGER NOT NULL DEFAULT 8,
                start_minute INTEGER NOT NULL DEFAULT 0,
                end_hour INTEGER NOT NULL DEFAULT 18,
                end_minute INTEGER NOT NULL DEFAULT 0,
                is_enabled BOOLEAN NOT NULL DEFAULT TRUE
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS api_workhours;",
        ),
    ]