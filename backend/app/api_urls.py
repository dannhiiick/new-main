from django.urls import path

from . import api_views
from .auth_views import LoginView, MeView, RegisterView, RefreshView, SettingsView

urlpatterns = [
    # Public catalog
    path("tracks", api_views.tracks_list, name="api-tracks"),
    path("artists", api_views.artists_list, name="api-artists"),
    path("albums", api_views.albums_list, name="api-albums"),
    path("playlists", api_views.playlists_list, name="api-playlists"),
    path("concerts", api_views.concerts_list, name="api-concerts"),
    path("media/music/<path:filename>", api_views.music_file, name="api-music-file"),

    # Auth
    path("auth/register", RegisterView.as_view(), name="api-auth-register"),
    path("auth/login", LoginView.as_view(), name="api-auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="api-auth-refresh"),
    path("auth/me", MeView.as_view(), name="api-auth-me"),
    path("settings", SettingsView.as_view(), name="api-settings"),
]

