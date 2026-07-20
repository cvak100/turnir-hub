from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.players.models import PlayerStatus
from apps.users.serializers.person_full import PlayerStatusSerializer


class PlayerStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PlayerStatusSerializer
    queryset = PlayerStatus.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
