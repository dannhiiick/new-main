from urllib.parse import quote

from django.contrib import admin
from django.utils.html import format_html

from .models import Artist, Track, Album, Playlist, Concert, UserProfile

admin.site.site_header = "MoodStream Admin"
admin.site.site_title = "MoodStream"
admin.site.index_title = "Каталог и музыка"


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "genre", "city", "followers")
    search_fields = ("name", "genre", "city")
    list_filter = ("genre", "country", "city")


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "artist", "genre", "language", "explicit", "ai_generated", "label_name", "plays", "audio_status")
    list_filter = ("genre", "language", "explicit", "ai_generated")
    search_fields = ("title", "artist", "label_name", "music_author", "lyrics_author")
    readonly_fields = ("audio_preview",)
    fieldsets = (
        ("📀 Основная информация", {
            "fields": ("title", "artist", "artist_ref", "genre", "language", "duration", "plays")
        }),
        ("🖼️ Медиафайлы", {
            "fields": ("cover_image", "cover", "audio_file", "audio_preview")
        }),
        ("✍️ Авторство", {
            "fields": ("music_author", "lyrics_author", "arranger", "mixing_engineer")
        }),
        ("ℹ️ Метаданные", {
            "fields": ("explicit", "ai_generated", "label_name", "copyright")
        }),
    )

    @admin.display(description="Аудио")
    def audio_status(self, obj):
        return "✅ Есть" if obj.audio_file else "❌ Нет"

    @admin.display(description="Превью")
    def audio_preview(self, obj):
        if not obj.audio_file:
            return "Файл не загружен"
        return format_html(
            '<audio controls preload="none" style="width: min(460px, 100%);" src="{}"></audio>',
            obj.audio_file.url,
        )


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "artist", "year")
    search_fields = ("title", "artist")
    list_filter = ("year",)
    filter_horizontal = ("tracks",)


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type")
    search_fields = ("name", "description", "creator")
    list_filter = ("type",)
    filter_horizontal = ("tracks",)


@admin.register(Concert)
class ConcertAdmin(admin.ModelAdmin):
    list_display = ("id", "artist", "city", "date", "ticketPrice")
    search_fields = ("artist", "venue", "city")
    list_filter = ("city", "date")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "display_name", "city", "language", "theme", "audio_quality")
    search_fields = ("user__username", "display_name", "city")
    list_filter = ("language", "theme", "audio_quality", "notifications_enabled", "private_profile")
