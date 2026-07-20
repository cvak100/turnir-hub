from rest_framework.routers import DefaultRouter

from apps.users.views.country import CountryViewSet
from apps.users.views.person import PersonViewSet
from apps.users.views.person_role_type import PersonRoleTypeViewSet
from apps.users.views.person_status import PersonStatusViewSet
from apps.users.views.player_status import PlayerStatusViewSet

router = DefaultRouter()
router.register(r"persons", PersonViewSet, basename="person")
router.register(r"countries", CountryViewSet, basename="country")
router.register(
    r"person-role-types",
    PersonRoleTypeViewSet,
    basename="person-role-type",
)
router.register(
    r"person-statuses",
    PersonStatusViewSet,
    basename="person-status",
)
router.register(
    r"player-statuses",
    PlayerStatusViewSet,
    basename="player-status",
)

urlpatterns = router.urls
