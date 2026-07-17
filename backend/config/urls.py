"""
URL configuration for turnir-hub.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/tournaments/", include("apps.tournaments.urls")),
    path("api/matches/", include("apps.matches.urls")),
    path("api/players/", include("apps.players.urls")),
]
