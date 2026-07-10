from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Artist, Track, Album, Playlist, Concert, Like, Follow,
    SavedPlaylist, RecentlyPlayed, PlayEvent, Notification,
    PlaylistTrack, PasswordResetToken
)

class MusicPlatformAPITests(APITestCase):

    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@qmusic.kz",
            password="TestPassword123"
        )
        # Create artist
        self.artist = Artist.objects.create(
            name="Dimash",
            genre="Pop",
            country="Kazakhstan",
            city="Aktobe"
        )
        # Create tracks
        self.track1 = Track.objects.create(
            title="Sen Barsan",
            artist="Dimash",
            genre="Pop",
            language="Kazakh",
            status="published",
            duration=274,
            artist_ref=self.artist
        )
        self.track2 = Track.objects.create(
            title="SOS",
            artist="Dimash",
            genre="Pop",
            language="French",
            status="published",
            duration=312,
            artist_ref=self.artist
        )
        self.draft_track = Track.objects.create(
            title="Draft Song",
            artist="Dimash",
            genre="Pop",
            language="Kazakh",
            status="draft",
            duration=200,
            artist_ref=self.artist
        )
        # Create album
        self.album = Album.objects.create(
            title="Stranger",
            artist="Dimash",
            year=2022
        )
        self.album.tracks.add(self.track1, through_defaults={"order": 1})
        self.album.tracks.add(self.track2, through_defaults={"order": 2})

        # Create playlist
        self.playlist = Playlist.objects.create(
            name="My Playlist",
            description="Favs",
            type="user",
            user=self.user,
            creator="testuser",
            is_public=True
        )
        self.playlist.tracks.add(self.track1, through_defaults={"order": 1})

        # Create concert
        self.concert = Concert.objects.create(
            artist="Dimash",
            venue="Astana Arena",
            date="2026-07-15",
            time="19:00",
            city="Astana",
            ticketPrice=15000,
            tickets_available=10,
            tickets_sold=0
        )

        # Get JWT Token for authenticated requests
        response = self.client.post(reverse("api-auth-login"), {
            "username": "testuser",
            "password": "TestPassword123"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_password_complexity(self):
        # Test short password
        response = self.client.post(reverse("api-auth-register"), {
            "username": "newuser",
            "email": "new@qmusic.kz",
            "password": "Short1"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("не менее 8 символов", response.data["detail"])

        # Test no capital letter
        response = self.client.post(reverse("api-auth-register"), {
            "username": "newuser",
            "email": "new@qmusic.kz",
            "password": "nocapital123"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("заглавную букву", response.data["detail"])

        # Test no digit
        response = self.client.post(reverse("api-auth-register"), {
            "username": "newuser",
            "email": "new@qmusic.kz",
            "password": "NoDigitPassword"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("хотя бы одну цифру", response.data["detail"])

    def test_forgot_reset_password(self):
        # Forgot password request
        response = self.client.post(reverse("api-auth-forgot-password"), {
            "email": "testuser@qmusic.kz"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        # Retrieve token from DB
        token_obj = PasswordResetToken.objects.filter(user=self.user, is_used=False).first()
        self.assertIsNotNone(token_obj)

        # Reset password
        reset_response = self.client.post(reverse("api-auth-reset-password"), {
            "token": token_obj.token,
            "new_password": "NewSecurePassword123"
        })
        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        self.assertTrue(reset_response.data["success"])

        # Verify token is used
        token_obj.refresh_from_db()
        self.assertTrue(token_obj.is_used)

    def test_catalog_lists_and_details(self):
        # Test track list
        response = self.client.get(reverse("api-tracks"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify draft tracks are hidden for regular users
        self.assertEqual(len(response.data), 2)  # track1 and track2 are published, draft_track is hidden

        # Test detail
        response = self.client.get(reverse("api-track-detail", kwargs={"pk": self.track1.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Sen Barsan")

        # Test draft track detail block
        response = self.client.get(reverse("api-track-detail", kwargs={"pk": self.draft_track.pk}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_global_search(self):
        response = self.client.get(reverse("api-search") + "?q=Sen")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tracks"]), 1)
        self.assertEqual(response.data["tracks"][0]["title"], "Sen Barsan")

    def test_play_tracking_aggregation(self):
        # Initially plays is 0
        self.assertEqual(self.track1.plays, 0)

        # Record a play
        response = self.client.post(reverse("api-track-play", kwargs={"pk": self.track1.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plays"], 1)

        # Record another play (anonymous user simulator)
        self.client.credentials()  # clear auth
        response = self.client.post(reverse("api-track-play", kwargs={"pk": self.track1.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plays"], 2)

        # Restore auth
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_user_library_operations(self):
        # Likes CRUD
        # 1. Add Like
        response = self.client.post(reverse("api-library-likes"), {"track_id": self.track1.pk})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Like.objects.filter(user=self.user, track=self.track1).exists())

        # 2. Get Likes
        response = self.client.get(reverse("api-library-likes"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 3. Delete Like
        response = self.client.delete(reverse("api-library-likes"), {"track_id": self.track1.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Like.objects.filter(user=self.user, track=self.track1).exists())

        # Follows CRUD
        response = self.client.post(reverse("api-library-follows"), {"artist_id": self.artist.pk})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Follow.objects.filter(user=self.user, artist=self.artist).exists())

        # Recently Played CRUD
        response = self.client.post(reverse("api-library-recently-played"), {"track_id": self.track1.pk})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RecentlyPlayed.objects.filter(user=self.user, track=self.track1).exists())

    def test_playlist_crud_and_track_manipulation(self):
        # Create playlist
        response = self.client.post(reverse("api-playlist-create"), {
            "name": "My New Playlist",
            "description": "Chill beats",
            "is_public": True
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_playlist_id = response.data["id"]

        # Add track to playlist
        response = self.client.post(reverse("api-playlist-modify-tracks", kwargs={"pk": new_playlist_id}), {
            "action": "add",
            "track_id": self.track2.pk
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tracks"]), 1)

        # Reorder tracks
        # Let's add track1 first so we have two tracks
        self.client.post(reverse("api-playlist-modify-tracks", kwargs={"pk": new_playlist_id}), {
            "action": "add",
            "track_id": self.track1.pk
        })
        # Reorder track1 (position index 1) to position 0 (order = 1)
        response = self.client.post(reverse("api-playlist-modify-tracks", kwargs={"pk": new_playlist_id}), {
            "action": "reorder",
            "track_id": self.track1.pk,
            "order": 1
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tracks"][0]["id"], self.track1.pk)

        # Remove track
        response = self.client.post(reverse("api-playlist-modify-tracks", kwargs={"pk": new_playlist_id}), {
            "action": "remove",
            "track_id": self.track2.pk
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tracks"]), 1)

    def test_user_notifications(self):
        # Create notification
        Notification.objects.create(
            user=self.user,
            title="Welcome",
            body="Thanks for joining!"
        )

        # List notifications
        response = self.client.get(reverse("api-notifications"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(response.data[0]["is_read"])

        # Mark as read
        response = self.client.patch(reverse("api-notifications"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(user=self.user, is_read=True).exists())

    def test_concert_ticket_purchase(self):
        self.assertEqual(self.concert.tickets_available, 10)
        self.assertEqual(self.concert.tickets_sold, 0)

        response = self.client.post(reverse("api-concert-purchase", kwargs={"pk": self.concert.pk}), {
            "email": "customer@qmusic.kz",
            "phone": "+77071234567"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["tickets_available"], 9)
        self.assertEqual(response.data["tickets_sold"], 1)

        # Decrement until 0
        for _ in range(9):
            self.client.post(reverse("api-concert-purchase", kwargs={"pk": self.concert.pk}), {
                "email": "customer@qmusic.kz",
                "phone": "+77071234567"
            })
        
        # Out of tickets check
        response = self.client.post(reverse("api-concert-purchase", kwargs={"pk": self.concert.pk}), {
            "email": "customer@qmusic.kz",
            "phone": "+77071234567"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Билеты закончились")
