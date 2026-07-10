from django.urls import path

from . import api_views
from .auth_views import (
    LoginView, MeView, RegisterView, RefreshView, SettingsView,
    ForgotPasswordView, ResetPasswordView
)

urlpatterns = [
    # Catalog details & search
    path("search", api_views.global_search, name="api-search"),
    path("tracks/<int:pk>", api_views.track_detail, name="api-track-detail"),
    path("artists/<int:pk>", api_views.artist_detail, name="api-artist-detail"),
    path("albums/<int:pk>", api_views.album_detail, name="api-album-detail"),
    path("playlists/<int:pk>", api_views.playlist_detail, name="api-playlist-detail"),

    # Public catalog lists
    path("tracks", api_views.tracks_list, name="api-tracks"),
    path("artists", api_views.artists_list, name="api-artists"),
    path("albums", api_views.albums_list, name="api-albums"),
    path("playlists", api_views.playlists_list, name="api-playlists"),
    path("concerts", api_views.concerts_list, name="api-concerts"),
    path("media/music/<path:filename>", api_views.music_file, name="api-music-file"),

    # Play tracking
    path("tracks/<int:pk>/play", api_views.play_track, name="api-track-play"),

    # User Library
    path("library/likes", api_views.library_likes, name="api-library-likes"),
    path("library/follows", api_views.library_follows, name="api-library-follows"),
    path("library/saved-playlists", api_views.library_saved_playlists, name="api-library-saved-playlists"),
    path("library/recently-played", api_views.library_recently_played, name="api-library-recently-played"),

    # Playlist CRUD
    path("playlists/create", api_views.playlist_create, name="api-playlist-create"),
    path("playlists/<int:pk>", api_views.playlist_modify, name="api-playlist-modify"),
    path("playlists/<int:pk>/tracks", api_views.playlist_modify_tracks, name="api-playlist-modify-tracks"),

    # Notifications
    path("notifications", api_views.user_notifications, name="api-notifications"),

    # Concert booking
    path("concerts/<int:pk>/purchase", api_views.concert_purchase, name="api-concert-purchase"),

    # Auth
    path("auth/register", RegisterView.as_view(), name="api-auth-register"),
    path("auth/login", LoginView.as_view(), name="api-auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="api-auth-refresh"),
    path("auth/me", MeView.as_view(), name="api-auth-me"),
    path("auth/forgot-password", ForgotPasswordView.as_view(), name="api-auth-forgot-password"),
    path("auth/reset-password", ResetPasswordView.as_view(), name="api-auth-reset-password"),
    path("settings", SettingsView.as_view(), name="api-settings"),

    # Mobile compatibility routes
    path("v1/auth/email/register", RegisterView.as_view(), name="mobile-register"),
    path("v1/auth/email/login", LoginView.as_view(), name="mobile-login"),
    path("v1/auth/refresh", RefreshView.as_view(), name="mobile-refresh"),
    path("v1/auth/profile", MeView.as_view(), name="mobile-profile"),
    path("v1/auth/email/forgot", ForgotPasswordView.as_view(), name="mobile-forgot-password"),
    path("v1/auth/email/reset", ResetPasswordView.as_view(), name="mobile-reset-password"),
    path("v1/settings", SettingsView.as_view(), name="mobile-settings"),
]


