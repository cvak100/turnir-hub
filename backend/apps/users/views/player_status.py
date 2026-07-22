from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.views.catalog import AdminWritableCatalogMixin
from apps.players.models import PlayerStatus
from apps.users.serializers.person_full import PlayerStatusSerializer


class PlayerStatusViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    serializer_class = PlayerStatusSerializer
    queryset = PlayerStatus.objects.all()
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
