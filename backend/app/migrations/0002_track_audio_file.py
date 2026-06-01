# Generated manually to keep local music files compatible with the catalog API.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="audio_file",
            field=models.CharField(
                blank=True,
                help_text="Audio filename stored in the project music folder.",
                max_length=500,
            ),
        ),
    ]
