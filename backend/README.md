# Backend (Django + DRF)

## Run
- `cd backend`
- `pip install -r requirements.txt`
- `python manage.py migrate`
- `python manage.py sync_music`
- `python manage.py runserver 8002`

## API
Base: `http://localhost:8000/api/`
- GET `tracks`
- GET `artists`
- GET `albums`
- GET `playlists`
- GET `concerts`
- GET `media/music/<filename>`
