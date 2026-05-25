from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_remove_bike_chassis_bike_chassi_al'),
    ]

    operations = [
        migrations.RunSQL(
            sql="SELECT 1;",  # table ถูกสร้างแล้วโดย /dev/create-workhours/
            reverse_sql="DROP TABLE IF EXISTS api_workhours;",
        ),
    ]