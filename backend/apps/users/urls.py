from rest_framework.routers import DefaultRouter

from apps.users.views.person import PersonViewSet

router = DefaultRouter()
router.register(r"persons", PersonViewSet, basename="person")

urlpatterns = router.urls
