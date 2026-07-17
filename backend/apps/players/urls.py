from rest_framework.routers import DefaultRouter

from apps.players.views.participation import TeamParticipationViewSet
from apps.players.views.participation_player import TeamParticipationPlayerViewSet
from apps.players.views.player import PlayerViewSet
from apps.players.views.team import TeamViewSet
from apps.players.views.team_status import TeamStatusViewSet

router = DefaultRouter()
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"team-statuses", TeamStatusViewSet, basename="team-status")
router.register(
    r"team-participations",
    TeamParticipationViewSet,
    basename="team-participation",
)
router.register(r"players", PlayerViewSet, basename="player")
router.register(
    r"team-participation-players",
    TeamParticipationPlayerViewSet,
    basename="team-participation-player",
)

urlpatterns = router.urls
