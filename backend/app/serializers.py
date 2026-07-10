from rest_framework import serializers

from .models import Artist, Track, Album, Playlist, Concert, Notification


class TrackSerializer(serializers.ModelSerializer):
    audioUrl = serializers.SerializerMethodField()
    coverUrl = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "artist",
            "duration",
            "plays",
            "cover",
            "coverUrl",
            "genre",
            "language",
            "explicit",
            "ai_generated",
            "label_name",
            "audioUrl",
            "status",
            "published_at",
        ]

    def get_audioUrl(self, obj):
        if not obj.audio_file:
            return ""
        return obj.audio_file.url

    def get_coverUrl(self, obj):
        if not obj.cover_image:
            return ""
        return obj.cover_image.url


class ArtistSerializer(serializers.ModelSerializer):
    tracks = serializers.SerializerMethodField()

    class Meta:
        model = Artist
        fields = [
            "id",
            "name",
            "bio",
            "genre",
            "country",
            "city",
            "image",
            "followers",
            "tracks",
        ]

    def get_tracks(self, obj):
        # Only return published tracks in public list
        qs = obj.tracks.filter(status='published').order_by('-plays', 'id')
        return TrackSerializer(qs, many=True, context=self.context).data


class AlbumSerializer(serializers.ModelSerializer):
    tracks = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id",
            "title",
            "artist",
            "cover",
            "year",
            "tracks",
        ]

    def get_tracks(self, obj):
        # Retrieve tracks in their albumtrack order
        qs = obj.tracks.all().order_by("albumtrack__order")
        return TrackSerializer(qs, many=True, context=self.context).data


class PlaylistSerializer(serializers.ModelSerializer):
    tracks = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            "id",
            "name",
            "description",
            "cover",
            "type",
            "user",
            "is_public",
            "tracks",
            "creator",
        ]

    def get_tracks(self, obj):
        # Retrieve tracks in their playlisttrack order
        qs = obj.tracks.all().order_by("playlisttrack__order")
        return TrackSerializer(qs, many=True, context=self.context).data


class ConcertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concert
        fields = [
            "id",
            "artist",
            "venue",
            "date",
            "time",
            "city",
            "ticketPrice",
            "image",
            "tickets_available",
            "tickets_sold",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "body",
            "is_read",
            "created_at",
        ]

