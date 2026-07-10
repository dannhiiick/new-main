# Backend (Django + DRF)

## Run
- `cd backend`
- `pip install -r requirements.txt`
- `python manage.py migrate`
- `python manage.py sync_music`
- `python manage.py runserver 8002`

## Environment Variables (Production Hardening)
Configure these environment variables in your production environment:
- `DJANGO_SECRET_KEY`: Private cryptographic key for Django. (Always set in production!)
- `DJANGO_DEBUG`: Set to `True` for local debugging. Defaults to `False` (safe default).
- `DJANGO_ALLOWED_HOSTS`: Comma-separated list of host/domain names. Defaults to `localhost,127.0.0.1`.
- `CORS_ALLOW_ALL_ORIGINS`: Set to `True` to allow requests from any origin. Defaults to `False`.
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of approved origins.
- `EMAIL_BACKEND`: Django email backend path. Defaults to `django.core.mail.backends.console.EmailBackend`.
- `DEFAULT_FROM_EMAIL`: Sender email address for password resets. Defaults to `noreply@qmusic.kz`.

## API
Base: `http://localhost:8000/api/`
- GET `tracks` (supports `?page=`, `?page_size=`, `?genre=`, `?status=`)
- GET `artists` (supports `?page=`, `?page_size=`, `?genre=`)
- GET `albums` (supports `?page=`, `?page_size=`)
- GET `playlists` (supports `?page=`, `?page_size=`)
- GET `concerts` (supports `?page=`, `?page_size=`)
- GET `search` (supports `?q=...`)
- POST `tracks/<id>/play` (registers play counts)
- GET/POST/DELETE `library/likes` (track library)
- GET/POST/DELETE `library/follows` (artist library)
- GET/POST/DELETE `library/saved-playlists` (playlist library)
- GET/POST `library/recently-played` (recents history)
- POST `playlists/create` (create user playlists)
- PATCH/DELETE `playlists/<id>` (modify playlist)
- POST `playlists/<id>/tracks` (add/remove/reorder playlist tracks)
- GET/PATCH `notifications` (pull and toggle notifications read state)
- POST `concerts/<id>/purchase` (purchase ticket)
- POST `auth/forgot-password` / `auth/reset-password` (password recovery)
- GET `media/music/<filename>`

