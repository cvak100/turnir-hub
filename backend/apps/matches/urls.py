from rest_framework.routers import DefaultRouter

from apps.matches.views.match import (
    EventTypeViewSet,
    MatchEventViewSet,
    MatchStatusViewSet,
    MatchViewSet,
)

router = DefaultRouter()
router.register(r"matches", MatchViewSet, basename="match")
router.register(r"match-events", MatchEventViewSet, basename="match-event")
router.register(r"event-types", EventTypeViewSet, basename="event-type")
router.register(r"match-statuses", MatchStatusViewSet, basename="match-status")

urlpatterns = router.urls
