from django.core.management.base import BaseCommand
from django.db import transaction

from ...music_catalog import ALBUMS, ARTIST_DEFAULTS, MUSIC_TRACKS, PLAYLISTS
from ...models import Album, Artist, Playlist, Track


class Command(BaseCommand):
    help = "Create or update catalog records for every local audio file"

    def handle(self, *args, **options):
        with transaction.atomic():
            artists = {}
            for name, defaults in ARTIST_DEFAULTS.items():
                artist, _ = Artist.objects.update_or_create(
                    name=name,
                    defaults=defaults,
                )
                artists[name] = artist

            tracks = []
            for track_data in MUSIC_TRACKS:
                track, _ = Track.objects.update_or_create(
                    audio_file=track_data["audio_file"],
                    defaults={
                        "title": track_data["title"],
                        "artist": track_data["artist"],
                        "duration": track_data["duration"],
                        "plays": track_data["plays"],
                        "genre": track_data["genre"],
                        "language": track_data["language"],
                        "cover": track_data["cover"],
                        "artist_ref": artists.get(track_data["artist"]),
                    },
                )
                tracks.append(track)

            for album_data in ALBUMS:
                album, _ = Album.objects.update_or_create(
                    title=album_data["title"],
                    artist=album_data["artist"],
                    defaults={
                        "cover": album_data["cover"],
                        "year": album_data["year"],
                    },
                )
                album.tracks.set([tracks[index] for index in album_data["track_indexes"]])

            for playlist_data in PLAYLISTS:
                playlist, _ = Playlist.objects.update_or_create(
                    name=playlist_data["name"],
                    defaults={
                        "description": playlist_data["description"],
                        "cover": playlist_data["cover"],
                        "type": playlist_data["type"],
                        "creator": playlist_data["creator"],
                    },
                )
                playlist.tracks.set([tracks[index] for index in playlist_data["track_indexes"]])

        self.stdout.write(self.style.SUCCESS(f"Synced {len(tracks)} local tracks"))
