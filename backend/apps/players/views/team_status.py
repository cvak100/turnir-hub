from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.players.models import TeamStatus
from apps.players.serializers.team import TeamStatusSerializer


class TeamStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TeamStatusSerializer
    queryset = TeamStatus.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
