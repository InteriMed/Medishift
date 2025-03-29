from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_address_user_birthdate_user_cover_letter_url_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_temporary',
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['firebase_uid'], name='users_user_firebas_idx'),
        ),
    ] 