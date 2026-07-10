import mimetypes
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.http import FileResponse, Http404
from django.db.models import Q, Max
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Track, Artist, Album, Playlist, Concert, Like, Follow,
    SavedPlaylist, RecentlyPlayed, PlayEvent, Notification,
    PlaylistTrack, AlbumTrack
)
from .serializers import (
    TrackSerializer,
    ArtistSerializer,
    AlbumSerializer,
    PlaylistSerializer,
    ConcertSerializer,
    NotificationSerializer,
)


def paginate_queryset(queryset, request, serializer_class, context=None):
    # Filter by genre if query param is set
    genre = request.query_params.get("genre")
    if genre and hasattr(queryset.model, "genre"):
        queryset = queryset.filter(genre__icontains=genre)

    # Filter by status if query param is set
    status_param = request.query_params.get("status")
    if status_param and hasattr(queryset.model, "status"):
        queryset = queryset.filter(status=status_param)
    elif hasattr(queryset.model, "status"):
        # For non-staff, only return published tracks!
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            queryset = queryset.filter(status="published")

    # Order by ID by default to ensure consistent pagination
    if not queryset.query.order_by:
        queryset = queryset.order_by("id")

    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size", "10")

    if page:
        try:
            page = int(page)
            page_size = int(page_size)
            start = (page - 1) * page_size
            end = start + page_size
            count = queryset.count()
            sliced_qs = queryset[start:end]
            serialized_data = serializer_class(sliced_qs, many=True, context=context).data
            return {
                "count": count,
                "next": page + 1 if end < count else None,
                "previous": page - 1 if page > 1 else None,
                "results": serialized_data,
            }
        except ValueError:
            pass

    return serializer_class(queryset, many=True, context=context).data


# --- Public Catalog List Endpoints ---

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def tracks_list(request):
    qs = Track.objects.all().order_by("-plays", "id")
    data = paginate_queryset(qs, request, TrackSerializer, context={"request": request})
    return Response(data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def artists_list(request):
    qs = Artist.objects.all().order_by("id").prefetch_related("tracks")
    data = paginate_queryset(qs, request, ArtistSerializer, context={"request": request})
    return Response(data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def albums_list(request):
    qs = Album.objects.all().order_by("-year", "id").prefetch_related("tracks")
    data = paginate_queryset(qs, request, AlbumSerializer, context={"request": request})
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def playlists_list(request):
    qs = Playlist.objects.all().order_by("id").prefetch_related("tracks")
    # Non-authenticated users can only see public playlists
    if request.user and request.user.is_authenticated:
        qs = qs.filter(Q(is_public=True) | Q(user=request.user))
    else:
        qs = qs.filter(is_public=True)
    data = paginate_queryset(qs, request, PlaylistSerializer, context={"request": request})
    return Response(data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def concerts_list(request):
    qs = Concert.objects.all().order_by("id")
    data = paginate_queryset(qs, request, ConcertSerializer)
    return Response(data)


# --- Detail Endpoints ---

@api_view(["GET"])
@permission_classes([AllowAny])
def track_detail(request, pk):
    try:
        track = Track.objects.get(pk=pk)
    except Track.DoesNotExist:
        return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Hide draft tracks from regular users
    if track.status == 'draft' and not (request.user and request.user.is_authenticated and request.user.is_staff):
        return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)
        
    return Response(TrackSerializer(track, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def artist_detail(request, pk):
    try:
        artist = Artist.objects.get(pk=pk)
    except Artist.DoesNotExist:
        return Response({"detail": "Artist not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(ArtistSerializer(artist, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def album_detail(request, pk):
    try:
        album = Album.objects.get(pk=pk)
    except Album.DoesNotExist:
        return Response({"detail": "Album not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(AlbumSerializer(album, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def playlist_detail(request, pk):
    try:
        playlist = Playlist.objects.get(pk=pk)
    except Playlist.DoesNotExist:
        return Response({"detail": "Playlist not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if not playlist.is_public:
        if not request.user or not request.user.is_authenticated or playlist.user != request.user:
            return Response({"detail": "Playlist is private"}, status=status.HTTP_403_FORBIDDEN)
            
    return Response(PlaylistSerializer(playlist, context={"request": request}).data)


# --- Search Endpoint ---

@api_view(["GET"])
@permission_classes([AllowAny])
def global_search(request):
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response({"tracks": [], "artists": [], "albums": [], "playlists": []})

    tracks = Track.objects.filter(Q(title__icontains=q) | Q(artist__icontains=q))
    if not (request.user and request.user.is_authenticated and request.user.is_staff):
        tracks = tracks.filter(status="published")

    artists = Artist.objects.filter(name__icontains=q)
    albums = Album.objects.filter(Q(title__icontains=q) | Q(artist__icontains=q))
    playlists = Playlist.objects.filter(name__icontains=q)
    if request.user and request.user.is_authenticated:
        playlists = playlists.filter(Q(is_public=True) | Q(user=request.user))
    else:
        playlists = playlists.filter(is_public=True)

    ctx = {"request": request}
    return Response({
        "tracks": TrackSerializer(tracks[:15], many=True, context=ctx).data,
        "artists": ArtistSerializer(artists[:10], many=True, context=ctx).data,
        "albums": AlbumSerializer(albums[:10], many=True, context=ctx).data,
        "playlists": PlaylistSerializer(playlists[:10], many=True, context=ctx).data,
    })


# --- Audio File Server ---

@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def music_file(request, filename):
    media_music_dir = Path(settings.MEDIA_ROOT).resolve() / "music"
    file_path = (media_music_dir / filename).resolve()
    
    if media_music_dir not in file_path.parents or not file_path.exists() or not file_path.is_file():
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


# --- Track Play Aggregation ---

@api_view(["POST"])
@permission_classes([AllowAny])
def play_track(request, pk):
    try:
        track = Track.objects.get(pk=pk)
    except Track.DoesNotExist:
        return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user if request.user and request.user.is_authenticated else None
    PlayEvent.objects.create(user=user, track=track)

    # Aggregated calculation of plays count
    plays_count = PlayEvent.objects.filter(track=track).count()
    track.plays = plays_count
    track.save(update_fields=["plays"])

    return Response({"success": True, "plays": track.plays}, status=status.HTTP_200_OK)


# --- User Library Likes/Follows/SavedPlaylists/Recent ---

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def library_likes(request):
    if request.method == "GET":
        likes = Like.objects.filter(user=request.user).select_related("track")
        tracks = [lk.track for lk in likes]
        return Response(TrackSerializer(tracks, many=True, context={"request": request}).data)

    elif request.method == "POST":
        track_id = request.data.get("track_id") or request.data.get("track")
        if not track_id:
            return Response({"detail": "track_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            track = Track.objects.get(pk=track_id)
        except Track.DoesNotExist:
            return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)

        Like.objects.get_or_create(user=request.user, track=track)
        return Response({"success": True}, status=status.HTTP_201_CREATED)

    elif request.method == "DELETE":
        track_id = request.query_params.get("track_id") or request.data.get("track_id") or request.data.get("track")
        if not track_id:
            return Response({"detail": "track_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        Like.objects.filter(user=request.user, track_id=track_id).delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def library_follows(request):
    if request.method == "GET":
        follows = Follow.objects.filter(user=request.user).select_related("artist")
        artists = [fl.artist for fl in follows]
        return Response(ArtistSerializer(artists, many=True, context={"request": request}).data)

    elif request.method == "POST":
        artist_id = request.data.get("artist_id") or request.data.get("artist")
        if not artist_id:
            return Response({"detail": "artist_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            artist = Artist.objects.get(pk=artist_id)
        except Artist.DoesNotExist:
            return Response({"detail": "Artist not found"}, status=status.HTTP_404_NOT_FOUND)

        Follow.objects.get_or_create(user=request.user, artist=artist)
        return Response({"success": True}, status=status.HTTP_201_CREATED)

    elif request.method == "DELETE":
        artist_id = request.query_params.get("artist_id") or request.data.get("artist_id") or request.data.get("artist")
        if not artist_id:
            return Response({"detail": "artist_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        Follow.objects.filter(user=request.user, artist_id=artist_id).delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def library_saved_playlists(request):
    if request.method == "GET":
        saved = SavedPlaylist.objects.filter(user=request.user).select_related("playlist")
        playlists = [sv.playlist for sv in saved]
        return Response(PlaylistSerializer(playlists, many=True, context={"request": request}).data)

    elif request.method == "POST":
        playlist_id = request.data.get("playlist_id") or request.data.get("playlist")
        if not playlist_id:
            return Response({"detail": "playlist_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            playlist = Playlist.objects.get(pk=playlist_id)
        except Playlist.DoesNotExist:
            return Response({"detail": "Playlist not found"}, status=status.HTTP_404_NOT_FOUND)

        SavedPlaylist.objects.get_or_create(user=request.user, playlist=playlist)
        return Response({"success": True}, status=status.HTTP_201_CREATED)

    elif request.method == "DELETE":
        playlist_id = request.query_params.get("playlist_id") or request.data.get("playlist_id") or request.data.get("playlist")
        if not playlist_id:
            return Response({"detail": "playlist_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        SavedPlaylist.objects.filter(user=request.user, playlist_id=playlist_id).delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def library_recently_played(request):
    if request.method == "GET":
        recent = RecentlyPlayed.objects.filter(user=request.user).select_related("track")[:30]
        tracks = [rc.track for rc in recent]
        return Response(TrackSerializer(tracks, many=True, context={"request": request}).data)

    elif request.method == "POST":
        track_id = request.data.get("track_id") or request.data.get("track")
        if not track_id:
            return Response({"detail": "track_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            track = Track.objects.get(pk=track_id)
        except Track.DoesNotExist:
            return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)

        rp, created = RecentlyPlayed.objects.get_or_create(user=request.user, track=track)
        if not created:
            rp.played_at = timezone.now()
            rp.save()

        # Prune older plays to maintain a cap of 30
        recent_qs = RecentlyPlayed.objects.filter(user=request.user).order_by("-played_at")
        if recent_qs.count() > 30:
            ids_to_keep = recent_qs.values_list("id", flat=True)[:30]
            RecentlyPlayed.objects.filter(user=request.user).exclude(id__in=ids_to_keep).delete()

        return Response({"success": True}, status=status.HTTP_201_CREATED)


# --- Playlists CRUD ---

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def playlist_create(request):
    name = request.data.get("name", "Новый плейлист")
    desc = request.data.get("description", "")
    is_public = request.data.get("is_public", True)
    
    playlist = Playlist.objects.create(
        name=name,
        description=desc,
        type="user",
        user=request.user,
        creator=request.user.username,
        is_public=is_public
    )
    return Response(PlaylistSerializer(playlist, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def playlist_modify(request, pk):
    try:
        playlist = Playlist.objects.get(pk=pk)
    except Playlist.DoesNotExist:
        return Response({"detail": "Playlist not found"}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: Only owner or staff can modify/delete
    if playlist.user != request.user and not request.user.is_staff:
        return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "PATCH":
        if "name" in request.data:
            playlist.name = request.data.get("name")
        if "description" in request.data:
            playlist.description = request.data.get("description")
        if "is_public" in request.data:
            playlist.is_public = request.data.get("is_public")
        if "cover" in request.data:
            playlist.cover = request.data.get("cover")
        playlist.save()
        return Response(PlaylistSerializer(playlist, context={"request": request}).data, status=status.HTTP_200_OK)

    elif request.method == "DELETE":
        playlist.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def playlist_modify_tracks(request, pk):
    try:
        playlist = Playlist.objects.get(pk=pk)
    except Playlist.DoesNotExist:
        return Response({"detail": "Playlist not found"}, status=status.HTTP_404_NOT_FOUND)

    if playlist.user != request.user and not request.user.is_staff:
        return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

    action = request.data.get("action")
    track_id = request.data.get("track_id")

    if not action or action not in ["add", "remove", "reorder"]:
        return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
    if not track_id:
        return Response({"detail": "track_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        track = Track.objects.get(pk=track_id)
    except Track.DoesNotExist:
        return Response({"detail": "Track not found"}, status=status.HTTP_404_NOT_FOUND)

    if action == "add":
        max_order = PlaylistTrack.objects.filter(playlist=playlist).aggregate(Max("order"))["order__max"] or 0
        PlaylistTrack.objects.get_or_create(playlist=playlist, track=track, defaults={"order": max_order + 1})

    elif action == "remove":
        PlaylistTrack.objects.filter(playlist=playlist, track=track).delete()
        # Compact order indices
        pts = PlaylistTrack.objects.filter(playlist=playlist).order_by("order")
        for i, pt in enumerate(pts):
            pt.order = i + 1
            pt.save(update_fields=["order"])

    elif action == "reorder":
        new_order = request.data.get("order")
        if new_order is None:
            return Response({"detail": "order is required for reorder"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_order = int(new_order)
        except ValueError:
            return Response({"detail": "order must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        pt_to_move = PlaylistTrack.objects.filter(playlist=playlist, track=track).first()
        if pt_to_move:
            pts = list(PlaylistTrack.objects.filter(playlist=playlist).exclude(track=track).order_by("order"))
            # Insert at the new position (capped to length)
            insert_pos = max(0, min(new_order - 1, len(pts)))
            pts.insert(insert_pos, pt_to_move)
            # Save new order
            for i, pt in enumerate(pts):
                pt.order = i + 1
                pt.save(update_fields=["order"])

    return Response(PlaylistSerializer(playlist, context={"request": request}).data, status=status.HTTP_200_OK)


# --- Notifications ---

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_notifications(request):
    if request.method == "GET":
        qs = Notification.objects.filter(user=request.user).order_by("-created_at")
        return Response(NotificationSerializer(qs, many=True).data)

    elif request.method == "PATCH":
        # Mark all as read
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"success": True}, status=status.HTTP_200_OK)


# --- Concert Ticket Purchase ---

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def concert_purchase(request, pk):
    try:
        concert = Concert.objects.get(pk=pk)
    except Concert.DoesNotExist:
        return Response({"detail": "Concert not found"}, status=status.HTTP_404_NOT_FOUND)

    email = request.data.get("email")
    phone = request.data.get("phone")
    if not email and not phone:
        return Response({"detail": "email or phone is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Thread-safe booking using transaction and select_for_update
    with transaction.atomic():
        locked_concert = Concert.objects.select_for_update().get(pk=pk)
        if locked_concert.tickets_available <= 0:
            return Response({"detail": "Билеты закончились"}, status=status.HTTP_400_BAD_REQUEST)

        locked_concert.tickets_available -= 1
        locked_concert.tickets_sold += 1
        locked_concert.save()

    return Response({
        "success": True,
        "tickets_available": locked_concert.tickets_available,
        "tickets_sold": locked_concert.tickets_sold
    }, status=status.HTTP_200_OK)
