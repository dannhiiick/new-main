"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, HttpResponse
from django.views.static import serve
from pathlib import Path


def serve_frontend(request, path=""):
    """Serve React SPA — static assets or index.html for client-side routing."""
    dist = (Path(settings.BASE_DIR).resolve().parent / "front" / "dist").resolve()
    index_path = dist / "index.html"
    if not index_path.is_file():
        return HttpResponse(
            "<h1>Frontend not built</h1>"
            "<p>Соберите фронт: <code>cd front && npm ci && npm run build</code>, "
            "затем задеплойте каталог <code>front/dist</code> рядом с <code>backend</code>.</p>",
            status=503,
            content_type="text/html; charset=utf-8",
        )
    safe_path = (path or "").replace("\\", "/").strip("/")
    dist_resolved = dist.resolve()
    if safe_path:
        try:
            target = (dist / safe_path).resolve()
        except (OSError, ValueError):
            return FileResponse(index_path.open("rb"))
        if dist_resolved not in target.parents and target != dist_resolved:
            return FileResponse(index_path.open("rb"))
        if target.is_file():
            return FileResponse(target.open("rb"))
    return FileResponse(index_path.open("rb"))


# Media must be registered before the SPA catch-all, otherwise `/media/...` is handled as a frontend path (broken uploads from admin).
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.api_urls')),
]

# django.conf.urls.static.static() only registers /media/ when DEBUG=True.
# On PythonAnywhere production (DEBUG=False) uploads from admin still need /media/.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    media_prefix = settings.MEDIA_URL.strip("/")
    urlpatterns += [
        re_path(
            rf"^{media_prefix}/(?P<path>.*)$",
            serve,
            {"document_root": str(settings.MEDIA_ROOT)},
        ),
    ]

urlpatterns += [
    re_path(r'^(?P<path>.*)$', serve_frontend),
]

