from urllib.parse import quote
import os

from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from django.utils import timezone

from .models import (
    Artist, Track, Album, Playlist, Concert, UserProfile,
    AlbumTrack, PlaylistTrack, Like, Follow, SavedPlaylist,
    RecentlyPlayed, PlayEvent, Notification, PasswordResetToken
)

admin.site.site_header = "MoodStream Admin"
admin.site.site_title = "MoodStream"
admin.site.index_title = "Каталог и музыка"


class AlbumTrackInline(admin.TabularInline):
    model = AlbumTrack
    extra = 1


class PlaylistTrackInline(admin.TabularInline):
    model = PlaylistTrack
    extra = 1


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "genre", "city", "followers")
    search_fields = ("name", "genre", "city")
    list_filter = ("genre", "country", "city")


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = (
        "id", "cover_preview", "title", "artist", "genre",
        "language", "status", "published_at", "explicit",
        "ai_generated", "label_name", "plays", "audio_status"
    )
    list_filter = ("status", "genre", "language", "explicit", "ai_generated")
    search_fields = ("title", "artist", "label_name", "music_author", "lyrics_author")
    readonly_fields = ("audio_preview", "cover_preview_field")
    actions = ["make_published", "make_draft"]

    fieldsets = (
        ("📀 Основная информация", {
            "fields": ("title", "artist", "artist_ref", "genre", "language", "duration", "plays", "status", "published_at")
        }),
        ("🖼️ Медиафайлы", {
            "fields": ("cover_image", "cover_preview_field", "cover", "audio_file", "audio_preview")
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
        filename = os.path.basename(obj.audio_file.name)
        preview_url = f"/api/media/music/{quote(filename)}"
        return format_html(
            '<audio controls preload="none" style="width: min(460px, 100%);" src="{}"></audio>',
            preview_url,
        )

    @admin.display(description="Превью обложки")
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="max-height: 40px; max-width: 40px; border-radius: 4px; object-fit: cover;" />',
                obj.cover_image.url
            )
        return "—"

    @admin.display(description="Обложка")
    def cover_preview_field(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="max-height: 150px; max-width: 150px; border-radius: 8px; object-fit: cover;" />',
                obj.cover_image.url
            )
        return "Нет обложки"

    @admin.action(description="Опубликовать выбранные треки")
    def make_published(self, request, queryset):
        queryset.update(status="published", published_at=timezone.now())

    @admin.action(description="Снять с публикации (в черновики)")
    def make_draft(self, request, queryset):
        queryset.update(status="draft", published_at=None)


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "artist", "year")
    search_fields = ("title", "artist")
    list_filter = ("year",)
    inlines = [AlbumTrackInline]


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "user", "is_public")
    search_fields = ("name", "description", "creator")
    list_filter = ("type", "is_public")
    inlines = [PlaylistTrackInline]


class TicketsSoldFilter(admin.SimpleListFilter):
    title = "Билеты"
    parameter_name = "has_sales"

    def lookups(self, request, model_admin):
        return (
            ("yes", "Продано > 0"),
            ("no", "Нет продаж"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(tickets_sold__gt=0)
        if self.value() == "no":
            return queryset.filter(tickets_sold=0)
        return queryset


@admin.register(Concert)
class ConcertAdmin(admin.ModelAdmin):
    list_display = ("id", "artist", "city", "date", "ticketPrice", "tickets_available", "tickets_sold")
    search_fields = ("artist", "venue", "city")
    list_filter = ("city", "date", TicketsSoldFilter)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "display_name", "city", "language", "theme", "audio_quality")
    search_fields = ("user__username", "display_name", "city")
    list_filter = ("language", "theme", "audio_quality", "notifications_enabled", "private_profile")
    actions = ["block_profiles", "unblock_profiles"]

    @admin.action(description="Заблокировать выбранные аккаунты")
    def block_profiles(self, request, queryset):
        for profile in queryset:
            profile.user.is_active = False
            profile.user.save()
        self.message_user(request, "Пользователи успешно заблокированы.")

    @admin.action(description="Разблокировать выбранные аккаунты")
    def unblock_profiles(self, request, queryset):
        for profile in queryset:
            profile.user.is_active = True
            profile.user.save()
        self.message_user(request, "Пользователи успешно разблокированы.")


# --- Активность пользователя (read-only Inlines) ---

class LikeInline(admin.TabularInline):
    model = Like
    extra = 0
    readonly_fields = ("track", "created_at")
    can_delete = False
    verbose_name = "Лайк пользователя"
    verbose_name_plural = "Лайки пользователя"

    def has_add_permission(self, request, obj=None):
        return False


class RecentlyPlayedInline(admin.TabularInline):
    model = RecentlyPlayed
    extra = 0
    readonly_fields = ("track", "played_at")
    can_delete = False
    verbose_name = "Прослушанный трек"
    verbose_name_plural = "История прослушиваний"

    def has_add_permission(self, request, obj=None):
        return False


class SavedPlaylistInline(admin.TabularInline):
    model = SavedPlaylist
    extra = 0
    readonly_fields = ("playlist", "created_at")
    can_delete = False
    verbose_name = "Сохраненный плейлист"
    verbose_name_plural = "Сохраненные плейлисты"

    def has_add_permission(self, request, obj=None):
        return False


class UserPlaylistInline(admin.TabularInline):
    model = Playlist
    extra = 0
    readonly_fields = ("name", "type", "description", "is_public")
    can_delete = False
    verbose_name = "Созданный плейлист"
    verbose_name_plural = "Созданные плейлисты"

    def has_add_permission(self, request, obj=None):
        return False


admin.site.unregister(User)


@admin.register(User)
class CustomUserAdmin(DefaultUserAdmin):
    inlines = [LikeInline, RecentlyPlayedInline, SavedPlaylistInline, UserPlaylistInline]
    actions = ["block_users", "unblock_users"]

    @admin.action(description="Заблокировать аккаунты")
    def block_users(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, "Выбранные пользователи заблокированы.")

    @admin.action(description="Разблокировать аккаунты")
    def unblock_users(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, "Выбранные пользователи разблокированы.")

