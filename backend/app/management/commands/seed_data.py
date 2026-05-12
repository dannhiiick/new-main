from django.core.management.base import BaseCommand
from django.db import transaction

from ...music_catalog import ALBUMS, ARTIST_DEFAULTS, MUSIC_TRACKS, PLAYLISTS
from ...models import Artist, Track, Album, Playlist, Concert


class Command(BaseCommand):
    help = "Seed database with local music catalog"

    def handle(self, *args, **options):
        with transaction.atomic():
            Album.objects.all().delete()
            Playlist.objects.all().delete()
            Concert.objects.all().delete()
            Track.objects.all().delete()
            Artist.objects.all().delete()

            artists = {}
            for track in MUSIC_TRACKS:
                if track["artist"] in artists:
                    continue
                defaults = ARTIST_DEFAULTS[track["artist"]]
                artists[track["artist"]] = Artist.objects.create(
                    name=track["artist"],
                    **defaults,
                )

            tracks = []
            for track in MUSIC_TRACKS:
                tracks.append(
                    Track.objects.create(
                        title=track["title"],
                        artist=track["artist"],
                        duration=track["duration"],
                        plays=track["plays"],
                        genre=track["genre"],
                        language=track["language"],
                        cover=track["cover"],
                        audio_file=track["audio_file"],
                        artist_ref=artists.get(track["artist"]),
                    )
                )

            for album in ALBUMS:
                obj = Album.objects.create(
                    title=album["title"],
                    artist=album["artist"],
                    cover=album["cover"],
                    year=album["year"],
                )
                obj.tracks.set([tracks[index] for index in album["track_indexes"]])

            for playlist in PLAYLISTS:
                obj = Playlist.objects.create(
                    name=playlist["name"],
                    description=playlist["description"],
                    cover=playlist["cover"],
                    type=playlist["type"],
                    creator=playlist["creator"],
                )
                obj.tracks.set([tracks[index] for index in playlist["track_indexes"]])

            for concert in [
                {
                    "artist": "Zhan Malikov",
                    "venue": "Almaty Arena",
                    "date": "2026-06-15",
                    "time": "19:00",
                    "city": "Almaty",
                    "ticketPrice": 12000,
                    "image": "ZM",
                },
                {
                    "artist": "Jangali",
                    "venue": "Saryarka Amphitheater",
                    "date": "2026-07-20",
                    "time": "20:00",
                    "city": "Astana",
                    "ticketPrice": 9000,
                    "image": "JG",
                },
            ]:
                Concert.objects.create(**concert)

        self.stdout.write(self.style.SUCCESS("Local music catalog seeded successfully"))
