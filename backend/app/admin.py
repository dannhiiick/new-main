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
    list_display = ("id", "title", "artist", "genre", "language", "plays", "audio_status")
    list_filter = ("genre", "language", "artist")
    search_fields = ("title", "artist", "audio_file")
    readonly_fields = ("audio_preview",)
    fieldsets = (
        ("Основное", {"fields": ("title", "artist", "artist_ref", "genre", "language")}),
        ("Показ на главной", {"fields": ("cover", "duration", "plays")}),
        ("Аудио", {"fields": ("audio_file", "audio_preview")}),
    )

    @admin.display(description="Аудио")
    def audio_status(self, obj):
        return "Есть" if obj.audio_file else "Нет"

    @admin.display(description="Превью")
    def audio_preview(self, obj):
        if not obj.audio_file:
            return "Файл не указан"

        return format_html(
            '<audio controls preload="none" style="width: min(460px, 100%);" src="/api/media/music/{}"></audio>',
            quote(obj.audio_file, safe=""),
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
