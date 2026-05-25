from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_remove_bike_chassis_bike_chassi_al'),
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