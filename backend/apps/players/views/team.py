from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.players.models import Team
from apps.players.serializers.team import (
    TeamCreateUpdateSerializer,
    TeamDetailSerializer,
    TeamListSerializer,
)
from apps.players.services.team import TeamService


class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.select_related("status", "contact_person").all()

    def get_serializer_class(self):
        if self.action == "list":
            return TeamListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TeamCreateUpdateSerializer
        return TeamDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = TeamService.create_team(data=serializer.validated_data)
        output = TeamDetailSerializer(team, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        team = self.get_object()
        serializer = self.get_serializer(team, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        team = TeamService.update_team(team=team, data=serializer.validated_data)
        output = TeamDetailSerializer(team, context=self.get_serializer_context())
        return Response(output.data)
