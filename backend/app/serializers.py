from rest_framework import serializers

from .models import Artist, Track, Album, Playlist, Concert


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
        ]

    def get_audioUrl(self, obj):
        if not obj.audio_file:
            return ""
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.audio_file.url)
        return obj.audio_file.url

    def get_coverUrl(self, obj):
        if not obj.cover_image:
            return ""
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url


class ArtistSerializer(serializers.ModelSerializer):
    # Front expects nested `tracks: Track[]`
    tracks = TrackSerializer(many=True, read_only=True)

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


class AlbumSerializer(serializers.ModelSerializer):
    # Front expects `tracks: Track[]`
    tracks = TrackSerializer(many=True, read_only=True)

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


class PlaylistSerializer(serializers.ModelSerializer):
    tracks = TrackSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = [
            "id",
            "name",
            "description",
            "cover",
            "type",
            "tracks",
            "creator",
        ]


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
        ]
