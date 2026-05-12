import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view
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
def tracks_list(request):
    qs = Track.objects.all().order_by("id")
    return Response(TrackSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
def artists_list(request):
    qs = Artist.objects.all().order_by("id")
    return Response(ArtistSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
def albums_list(request):
    qs = Album.objects.all().order_by("id")
    return Response(AlbumSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
def playlists_list(request):
    qs = Playlist.objects.all().order_by("id")
    return Response(PlaylistSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
def concerts_list(request):
    qs = Concert.objects.all().order_by("id")
    return Response(ConcertSerializer(qs, many=True).data)


@api_view(["GET"])
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
