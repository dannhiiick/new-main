from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import uuid

from .models import UserProfile, PasswordResetToken


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
        "avatar": profile.avatar.url if profile.avatar else None,
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

        # Password complexity check
        import re
        if len(password) < 8:
            return Response(
                {"detail": "Пароль должен быть не менее 8 символов."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[A-Z]", password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну заглавную букву (A-Z)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[a-z]", password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну строчную букву (a-z)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[0-9]", password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну цифру (0-9)."},
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
        response = Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            },
            status=status.HTTP_201_CREATED,
        )
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            samesite="Lax",
            secure=False,
        )
        return response


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
        response = Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user(user),
            },
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            samesite="Lax",
            secure=False,
        )
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.COOKIES.get("refresh_token") or request.data.get("refresh")
        if not refresh:
            return Response({"detail": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh)
            access_token = str(token.access_token)
            response = Response({"access": access_token}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="refresh_token",
                value=str(token),
                httponly=True,
                samesite="Lax",
                secure=False,
            )
            return response
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

        if "avatar" in request.FILES:
            profile.avatar = request.FILES["avatar"]
        elif "avatar" in request.data:
            val = request.data.get("avatar")
            if not val or val == "null" or val == "":
                profile.avatar = None

        profile.save()

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


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.models import User
        user = User.objects.filter(email=email).first()
        if not user:
            # Prevent user enumeration but indicate a mock/success response
            return Response({"success": True, "detail": "Если этот email зарегистрирован, на него отправлен токен."})

        # Generate a short one-time token
        token = str(uuid.uuid4())[:8].upper()
        PasswordResetToken.objects.create(user=user, token=token)

        # Print the token to console for local API usage/debugging
        print(f"\n========================================\nPASSWORD RESET TOKEN FOR {email}: {token}\n========================================\n")

        # Simulate sending email
        from django.core.mail import send_mail
        try:
            send_mail(
                "Восстановление пароля - MoodStream",
                f"Ваш код для восстановления пароля: {token}",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({"success": True, "detail": "Код восстановления отправлен."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token")
        new_password = request.data.get("new_password") or request.data.get("password")

        if not token_str or not new_password:
            return Response({"detail": "Token and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Password complexity check
        import re
        if len(new_password) < 8:
            return Response(
                {"detail": "Пароль должен быть не менее 8 символов."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[A-Z]", new_password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну заглавную букву (A-Z)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[a-z]", new_password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну строчную букву (a-z)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not re.search(r"[0-9]", new_password):
            return Response(
                {"detail": "Пароль должен содержать хотя бы одну цифру (0-9)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_obj = PasswordResetToken.objects.filter(token=token_str, is_used=False).first()
        if not token_obj:
            return Response({"detail": "Неверный или использованный токен."}, status=status.HTTP_400_BAD_REQUEST)

        # Expiry: 1 hour
        from django.utils import timezone
        if (timezone.now() - token_obj.created_at).total_seconds() > 3600:
            return Response({"detail": "Срок действия токена истек."}, status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(new_password)
        user.save()

        # Mark token as used
        token_obj.is_used = True
        token_obj.save()

        return Response({"success": True, "detail": "Пароль успешно сброшен."})


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        res = Response({"success": True}, status=status.HTTP_200_OK)
        res.delete_cookie("refresh_token")
        return res

