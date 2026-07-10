#!/usr/bin/env python
"""
ensure_admin.py — Idempotent superuser bootstrap for Render deploys.

Reads DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL and
DJANGO_SUPERUSER_PASSWORD from the environment.  If the user already
exists — does nothing.  If env vars are missing — prints a message and
exits with code 0 (so deploys don't break in envs where admin is not needed).
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django  # noqa: E402
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402

User = get_user_model()


def main():
    username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
    email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
    password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

    if not username or not password:
        print(
            "ensure_admin: DJANGO_SUPERUSER_USERNAME / DJANGO_SUPERUSER_PASSWORD "
            "not set — skipping superuser creation."
        )
        return

    if User.objects.filter(username=username).exists():
        print(f"ensure_admin: superuser '{username}' already exists — nothing to do.")
        return

    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"ensure_admin: superuser '{username}' created successfully.")


if __name__ == "__main__":
    main()
