from rest_framework.routers import DefaultRouter

from apps.tournaments.views.edition import TournamentEditionViewSet
from apps.tournaments.views.lookups import (
    GlobalRuleTemplateViewSet,
    SportViewSet,
    TournamentCategoryViewSet,
    TournamentFormatViewSet,
    TournamentStatusViewSet,
)
from apps.tournaments.views.phase import (
    TournamentPhaseGroupTeamViewSet,
    TournamentPhaseGroupViewSet,
    TournamentPhaseViewSet,
)
from apps.tournaments.views.tournament import TournamentViewSet

router = DefaultRouter()
router.register(r"tournaments", TournamentViewSet, basename="tournament")
router.register(r"sports", SportViewSet, basename="sport")
router.register(
    r"tournament-statuses",
    TournamentStatusViewSet,
    basename="tournament-status",
)
router.register(
    r"tournament-formats",
    TournamentFormatViewSet,
    basename="tournament-format",
)
router.register(
    r"tournament-categories",
    TournamentCategoryViewSet,
    basename="tournament-category",
)
router.register(
    r"global-rule-templates",
    GlobalRuleTemplateViewSet,
    basename="global-rule-template",
)
router.register(r"editions", TournamentEditionViewSet, basename="edition")
router.register(r"phases", TournamentPhaseViewSet, basename="phase")
router.register(r"groups", TournamentPhaseGroupViewSet, basename="group")
router.register(r"group-teams", TournamentPhaseGroupTeamViewSet, basename="group-team")
# Backward-compatible aliases
router.register(r"phase-groups", TournamentPhaseGroupViewSet, basename="phase-group")
router.register(
    r"phase-group-teams",
    TournamentPhaseGroupTeamViewSet,
    basename="phase-group-team",
)

urlpatterns = router.urls
