from urllib.parse import quote

from rest_framework import serializers

from .models import Artist, Track, Album, Playlist, Concert


class TrackSerializer(serializers.ModelSerializer):
    audioFile = serializers.CharField(source="audio_file", read_only=True)
    audioUrl = serializers.SerializerMethodField()

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "artist",
            "duration",
            "plays",
            "cover",
            "genre",
            "language",
            "audioFile",
            "audioUrl",
        ]

    def get_audioUrl(self, obj):
        if not obj.audio_file:
            return ""

        request = self.context.get("request")
        path = f"/api/media/music/{quote(obj.audio_file, safe='')}"
        if request is None:
            return path

        return request.build_absolute_uri(path)


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
