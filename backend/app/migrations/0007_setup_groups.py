from django.db import migrations

def create_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    catalog_models = ["artist", "track", "album", "playlist"]
    support_models = ["userprofile", "notification"]

    # 1. Catalog Moderator: manages artists, tracks, albums, playlists
    catalog_group, _ = Group.objects.get_or_create(name="Catalog Moderator")
    catalog_perms = Permission.objects.filter(
        content_type__model__in=catalog_models
    )
    catalog_group.permissions.set(catalog_perms)

    # 2. Support: manages user profiles and notifications
    support_group, _ = Group.objects.get_or_create(name="Support")
    support_perms = Permission.objects.filter(
        content_type__model__in=support_models
    )
    support_group.permissions.set(support_perms)

    # 3. Full Access: has all permissions
    full_access_group, _ = Group.objects.get_or_create(name="Full Access")
    all_perms = Permission.objects.all()
    full_access_group.permissions.set(all_perms)

def remove_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=["Catalog Moderator", "Support", "Full Access"]).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('app', '0006_album_tracks_playlist_tracks'),
    ]

    operations = [
        migrations.RunPython(create_groups, reverse_code=remove_groups),
    ]
