from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.players.models import Team
from apps.players.serializers.team import (
    TeamCreateUpdateSerializer,
    TeamDetailSerializer,
    TeamListSerializer,
)
from apps.players.services.team import TeamService
from apps.users.permissions import HasPermission
from apps.users.permissions.utils import set_action_permission


class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    queryset = Team.objects.select_related("status", "contact_person").all()

    def get_permissions(self):
        set_action_permission(
            self,
            {
                "list": "team.view",
                "retrieve": "team.view",
                "create": "team.manage",
                "update": "team.manage",
                "partial_update": "team.manage",
                "destroy": "team.manage",
            },
            default="team.view",
        )
        return super().get_permissions()

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
