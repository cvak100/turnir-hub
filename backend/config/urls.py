from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.core.views.health import HealthView
from apps.users.views.auth import MeView, MyPermissionsView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/v1/", include("apps.tournaments.urls")),
    path("api/v1/", include("apps.players.urls")),
    path("api/v1/", include("apps.matches.urls")),
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/public/", include("apps.core.urls")),
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "api/v1/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path(
        "api/v1/auth/token/verify/",
        TokenVerifyView.as_view(),
        name="token_verify",
    ),
    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),
    path(
        "api/v1/auth/my-permissions/",
        MyPermissionsView.as_view(),
        name="auth-my-permissions",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
