# Generated manually for account profile and settings.

import django.conf
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_track_audio_file"),
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(blank=True, max_length=255)),
                ("bio", models.TextField(blank=True)),
                ("city", models.CharField(blank=True, max_length=255)),
                (
                    "language",
                    models.CharField(choices=[("ru", "ru"), ("kk", "kk"), ("en", "en")], default="ru", max_length=10),
                ),
                (
                    "theme",
                    models.CharField(
                        choices=[("system", "system"), ("light", "light"), ("dark", "dark")],
                        default="system",
                        max_length=20,
                    ),
                ),
                (
                    "audio_quality",
                    models.CharField(
                        choices=[("auto", "auto"), ("high", "high"), ("saver", "saver")],
                        default="auto",
                        max_length=20,
                    ),
                ),
                ("autoplay", models.BooleanField(default=True)),
                ("notifications_enabled", models.BooleanField(default=True)),
                ("private_profile", models.BooleanField(default=False)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=django.conf.settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
