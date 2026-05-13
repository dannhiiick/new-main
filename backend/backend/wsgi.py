"""
WSGI config for the backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from pathlib import Path

# Some hosts (e.g. PythonAnywhere workers) have no usable system temp dir — tempfile then raises FileNotFoundError.
_backend_dir = Path(__file__).resolve().parent.parent  # directory that contains manage.py
_runtime_tmp = _backend_dir / "tmp"
_runtime_tmp.mkdir(exist_ok=True)
os.environ.setdefault("TMPDIR", str(_runtime_tmp))
os.environ.setdefault("TEMP", str(_runtime_tmp))
os.environ.setdefault("TMP", str(_runtime_tmp))

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

application = get_wsgi_application()
