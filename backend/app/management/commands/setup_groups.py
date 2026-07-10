from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

class Command(BaseCommand):
    help = "Настройка групп Django с различными уровнями прав доступа (модератор каталога, поддержка, полный доступ)"

    def handle(self, *args, **options):
        # 1. Группа: Модератор каталога
        moderator_group, _ = Group.objects.get_or_create(name="модератор каталога")
        moderator_models = ["artist", "album", "track", "playlist", "albumtrack", "playlisttrack"]
        moderator_perms = Permission.objects.filter(
            content_type__app_label="app",
            content_type__model__in=moderator_models
        )
        moderator_group.permissions.set(moderator_perms)
        self.stdout.write(self.style.SUCCESS(f"Настроена группа 'модератор каталога' с {moderator_perms.count()} правами."))

        # 2. Группа: Поддержка
        support_group, _ = Group.objects.get_or_create(name="поддержка")
        support_perms = Permission.objects.filter(
            content_type__app_label="app",
            content_type__model__in=["concert", "notification"]
        ) | Permission.objects.filter(
            content_type__app_label="auth",
            content_type__model="user",
            codename__startswith="view_"
        ) | Permission.objects.filter(
            content_type__app_label="app",
            content_type__model="userprofile",
            codename__startswith="view_"
        )
        support_group.permissions.set(support_perms)
        self.stdout.write(self.style.SUCCESS(f"Настроена группа 'поддержка' с {support_perms.count()} правами."))

        # 3. Группа: Полный доступ
        full_group, _ = Group.objects.get_or_create(name="полный доступ")
        all_perms = Permission.objects.all()
        full_group.permissions.set(all_perms)
        self.stdout.write(self.style.SUCCESS(f"Настроена группа 'полный доступ' с {all_perms.count()} правами."))
