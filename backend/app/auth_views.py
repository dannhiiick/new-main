from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile


def get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def serialize_user(user):
    profile = get_profile(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email or None,
        "isStaff": user.is_staff,
        "displayName": profile.display_name,
        "bio": profile.bio,
        "city": profile.city,
        "settings": serialize_settings(profile),
    }


def serialize_settings(profile):
    return {
        "language": profile.language,
        "theme": profile.theme,
        "audioQuality": profile.audio_quality,
        "autoplay": profile.autoplay,
        "notificationsEnabled": profile.notifications_enabled,
        "privateProfile": profile.private_profile,
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"detail": "username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional: basic email validation if provided
        if email is not None and email == "":
            email = None

        from django.contrib.auth.models import User

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "username already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, display_name=username)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"detail": "username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            },
            status=status.HTTP_200_OK,
        )


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh)
            access_token = str(token.access_token)
            return Response({"access": access_token}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(serialize_user(request.user), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile = get_profile(user)

        username = request.data.get("username", user.username)
        email = request.data.get("email", user.email)

        if not username:
            return Response({"detail": "username is required"}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.models import User

        username_exists = User.objects.exclude(id=user.id).filter(username=username).exists()
        if username_exists:
            return Response({"detail": "username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user.username = username
        user.email = email or ""
        user.save(update_fields=["username", "email"])

        for field in ("display_name", "bio", "city"):
            if field in request.data:
                setattr(profile, field, request.data.get(field) or "")
        profile.save(update_fields=["display_name", "bio", "city"])

        return Response(serialize_user(user), status=status.HTTP_200_OK)


class SettingsView(APIView):
    permission_classes = [IsAuthenticated]

    allowed_fields = {
        "language": "language",
        "theme": "theme",
        "audioQuality": "audio_quality",
        "autoplay": "autoplay",
        "notificationsEnabled": "notifications_enabled",
        "privateProfile": "private_profile",
    }

    def get(self, request):
        return Response(serialize_settings(get_profile(request.user)), status=status.HTTP_200_OK)

    def patch(self, request):
        profile = get_profile(request.user)

        for api_field, model_field in self.allowed_fields.items():
            if api_field in request.data:
                setattr(profile, model_field, request.data.get(api_field))

        profile.save(update_fields=list(self.allowed_fields.values()))
        return Response(serialize_settings(profile), status=status.HTTP_200_OK)

