#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Same as wsgi.py: ensure tempfile has a writable directory (PythonAnywhere Bash / workers).
_backend_dir = Path(__file__).resolve().parent
_runtime_tmp = _backend_dir / "tmp"
_runtime_tmp.mkdir(exist_ok=True)
os.environ.setdefault("TMPDIR", str(_runtime_tmp))
os.environ.setdefault("TEMP", str(_runtime_tmp))
os.environ.setdefault("TMP", str(_runtime_tmp))


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
