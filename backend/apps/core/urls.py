from rest_framework.routers import DefaultRouter

from apps.core.views.public import (
    PublicMatchViewSet,
    PublicTournamentEditionViewSet,
    PublicTournamentViewSet,
)

router = DefaultRouter()
router.register(r"tournaments", PublicTournamentViewSet, basename="public-tournament")
router.register(r"editions", PublicTournamentEditionViewSet, basename="public-edition")
router.register(r"matches", PublicMatchViewSet, basename="public-match")

urlpatterns = router.urls
