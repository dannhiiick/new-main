import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Track, Artist, Album, Playlist, Concert
from .serializers import (
    TrackSerializer,
    ArtistSerializer,
    AlbumSerializer,
    PlaylistSerializer,
    ConcertSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def tracks_list(request):
    qs = Track.objects.all().order_by("-plays", "id")
    return Response(TrackSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def artists_list(request):
    qs = Artist.objects.all().order_by("id").prefetch_related("tracks")
    return Response(ArtistSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def albums_list(request):
    qs = Album.objects.all().order_by("-year", "id").prefetch_related("tracks")
    return Response(AlbumSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def playlists_list(request):
    qs = Playlist.objects.all().order_by("id").prefetch_related("tracks")
    return Response(PlaylistSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def concerts_list(request):
    qs = Concert.objects.all().order_by("id")
    return Response(ConcertSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def music_file(request, filename):
    music_root = Path(settings.MUSIC_ROOT).resolve()
    file_path = (music_root / filename).resolve()

    if music_root not in file_path.parents and file_path != music_root:
        raise Http404("Audio file not found")

    if not file_path.exists() or not file_path.is_file():
        raise Http404("Audio file not found")

    content_type, _ = mimetypes.guess_type(file_path.name)
    return FileResponse(
        file_path.open("rb"),
        content_type=content_type or "application/octet-stream",
    )
