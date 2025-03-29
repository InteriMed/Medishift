from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_is_temporary_user_firebase_uid_idx'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='is_temporary',
            field=models.BooleanField(null=True, default=False),
        ),
    ] 