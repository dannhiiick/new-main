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
    class Language(models.TextChoices):
        KAZAKH = "Kazakh", "Казахский"
        RUSSIAN = "Russian", "Русский"
        ENGLISH = "English", "Английский"
        OTHER = "Other", "Другой"

    # --- Основная информация ---
    title = models.CharField(max_length=255, verbose_name="Название сингла")
    artist = models.CharField(max_length=255, verbose_name="Имя артиста")
    genre = models.CharField(max_length=255, verbose_name="Жанр")
    language = models.CharField(
        max_length=50,
        choices=Language.choices,
        default=Language.KAZAKH,
        verbose_name="Язык сингла",
    )
    duration = models.PositiveIntegerField(help_text="Секунды", default=0, verbose_name="Длительность")
    plays = models.PositiveBigIntegerField(default=0, verbose_name="Прослушиваний")

    # --- Медиафайлы ---
    cover_image = models.ImageField(
        upload_to="covers/",
        blank=True,
        null=True,
        verbose_name="Обложка песни",
    )
    cover = models.CharField(max_length=255, blank=True, verbose_name="Код обложки (старое)")
    audio_file = models.FileField(
        upload_to="music/",
        blank=True,
        null=True,
        verbose_name="Аудиофайл",
    )

    # --- Авторство ---
    music_author = models.CharField(max_length=500, blank=True, verbose_name="Автор музыки")
    lyrics_author = models.CharField(max_length=500, blank=True, verbose_name="Автор слов")
    arranger = models.CharField(max_length=500, blank=True, verbose_name="Аранжировщик")
    mixing_engineer = models.CharField(max_length=500, blank=True, verbose_name="Сведение")

    # --- Метаданные ---
    explicit = models.BooleanField(default=False, verbose_name="Нецензурные слова")
    ai_generated = models.BooleanField(default=False, verbose_name="Создано с помощью ИИ")
    label_name = models.CharField(max_length=255, blank=True, verbose_name="Название лейбла")
    copyright = models.CharField(max_length=500, blank=True, verbose_name="Авторское право")

    # --- Связь с артистом ---
    artist_ref = models.ForeignKey(
        Artist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tracks",
        verbose_name="Артист (из каталога)",
    )

    class Meta:
        verbose_name = "Трек"
        verbose_name_plural = "Треки"

    def __str__(self) -> str:
        return f"{self.artist} — {self.title}"


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
