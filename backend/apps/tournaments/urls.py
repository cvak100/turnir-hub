from rest_framework.routers import DefaultRouter

from apps.tournaments.views.edition import TournamentEditionViewSet
from apps.tournaments.views.phase import (
    TournamentPhaseGroupTeamViewSet,
    TournamentPhaseGroupViewSet,
    TournamentPhaseViewSet,
)
from apps.tournaments.views.tournament import TournamentViewSet

router = DefaultRouter()
router.register(r"tournaments", TournamentViewSet, basename="tournament")
router.register(r"editions", TournamentEditionViewSet, basename="edition")
router.register(r"phases", TournamentPhaseViewSet, basename="phase")
router.register(r"phase-groups", TournamentPhaseGroupViewSet, basename="phase-group")
router.register(
    r"phase-group-teams",
    TournamentPhaseGroupTeamViewSet,
    basename="phase-group-team",
)

urlpatterns = router.urls
