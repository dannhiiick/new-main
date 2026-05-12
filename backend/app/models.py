from django.db import models
from django.conf import settings


class Artist(models.Model):
    name = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    genre = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    image = models.CharField(max_length=255, blank=True)
    followers = models.PositiveBigIntegerField(default=0)

    def __str__(self) -> str:
        return self.name


class UserProfile(models.Model):
    class Theme(models.TextChoices):
        SYSTEM = "system", "system"
        LIGHT = "light", "light"
        DARK = "dark", "dark"

    class Language(models.TextChoices):
        RU = "ru", "ru"
        KK = "kk", "kk"
        EN = "en", "en"

    class AudioQuality(models.TextChoices):
        AUTO = "auto", "auto"
        HIGH = "high", "high"
        SAVER = "saver", "saver"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=10, choices=Language.choices, default=Language.RU)
    theme = models.CharField(max_length=20, choices=Theme.choices, default=Theme.SYSTEM)
    audio_quality = models.CharField(
        max_length=20,
        choices=AudioQuality.choices,
        default=AudioQuality.AUTO,
    )
    autoplay = models.BooleanField(default=True)
    notifications_enabled = models.BooleanField(default=True)
    private_profile = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.display_name or self.user.username


class Track(models.Model):
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    duration = models.PositiveIntegerField(help_text="Seconds")
    plays = models.PositiveBigIntegerField(default=0)
    genre = models.CharField(max_length=255)
    language = models.CharField(max_length=255)
    cover = models.CharField(max_length=255, blank=True)
    audio_file = models.CharField(
        max_length=500,
        blank=True,
        help_text="Audio filename stored in the project music folder.",
    )

    # Optional normalization: connect track to Artist record.
    artist_ref = models.ForeignKey(
        Artist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tracks",
    )

    def __str__(self) -> str:
        return self.title


class Album(models.Model):
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    cover = models.CharField(max_length=255, blank=True)
    year = models.PositiveIntegerField()
    tracks = models.ManyToManyField(Track, related_name="albums", blank=True)

    def __str__(self) -> str:
        return self.title


class Playlist(models.Model):
    class PlaylistType(models.TextChoices):
        EDITORIAL = "editorial", "editorial"
        THEMATIC = "thematic", "thematic"
        USER = "user", "user"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cover = models.CharField(max_length=255, blank=True)
    type = models.CharField(max_length=20, choices=PlaylistType.choices)
    tracks = models.ManyToManyField(Track, related_name="playlists", blank=True)
    creator = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.name


class Concert(models.Model):
    artist = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    date = models.DateField()
    time = models.CharField(max_length=50)
    city = models.CharField(max_length=255)
    ticketPrice = models.PositiveIntegerField()
    image = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.artist} - {self.date}".strip()
