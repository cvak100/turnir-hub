from rest_framework.routers import DefaultRouter

from apps.matches.views.match import MatchEventViewSet, MatchViewSet

router = DefaultRouter()
router.register(r"matches", MatchViewSet, basename="match")
router.register(r"match-events", MatchEventViewSet, basename="match-event")

urlpatterns = router.urls
