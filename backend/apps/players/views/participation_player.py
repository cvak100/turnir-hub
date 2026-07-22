from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.utils import scope_public_or_accessible, scope_queryset_to_editions
from apps.players.models import TeamParticipationPlayer
from apps.players.serializers.participation_player import (
    TeamParticipationPlayerCreateUpdateSerializer,
    TeamParticipationPlayerDetailSerializer,
    TeamParticipationPlayerListSerializer,
)
from apps.players.services.participation_player import TeamParticipationPlayerService
from apps.users.permissions import HasTournamentPermission
from apps.users.permissions.utils import set_action_permission


class TeamParticipationPlayerViewSet(viewsets.ModelViewSet):
    permission_classes = [HasTournamentPermission]
    filterset_fields = [
        "team_participation",
        "player",
        "status",
        "is_captain",
        "is_vice_captain",
        "is_active",
    ]
    search_fields = [
        "player__person__first_name",
        "player__person__last_name",
        "player__person__nickname",
        "team_participation__participation_name",
        "team_participation__team__name",
    ]
    ordering_fields = [
        "jersey_number",
        "created_at",
        "goals",
        "assists",
        "matches_played",
        "position",
        "is_captain",
        "player__person__last_name",
        "player__person__first_name",
    ]
    ordering = ["jersey_number"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "list": "player.view",
                "retrieve": "player.view",
                "create": "player.assign",
                "update": "player.assign",
                "partial_update": "player.assign",
                "destroy": "player.assign",
            },
            default="player.view",
        )
        return super().get_permissions()

    def get_queryset(self):
        qs = TeamParticipationPlayer.objects.select_related(
            "team_participation",
            "team_participation__team",
            "team_participation__tournament_edition",
            "player",
            "player__person",
            "player__status",
            "status",
        ).all()
        participation = self.request.query_params.get("team_participation")
        if participation:
            qs = qs.filter(team_participation_id=participation)
        edition = self.request.query_params.get("tournament_edition")
        if edition:
            qs = qs.filter(team_participation__tournament_edition_id=edition)
        team = self.request.query_params.get("team")
        if team:
            qs = qs.filter(team_participation__team_id=team)
        if self.action in ("list", "retrieve"):
            return scope_public_or_accessible(
                self.request.user,
                qs,
                public_lookup="team_participation__tournament_edition__is_public",
                edition_lookup="team_participation__tournament_edition_id",
            )
        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "team_participation__tournament_edition_id",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TeamParticipationPlayerListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TeamParticipationPlayerCreateUpdateSerializer
        return TeamParticipationPlayerDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = TeamParticipationPlayerService.create_participation_player(
            data=serializer.validated_data,
        )
        output = TeamParticipationPlayerDetailSerializer(
            obj,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        obj = self.get_object()
        serializer = self.get_serializer(obj, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = TeamParticipationPlayerService.update_participation_player(
            participation_player=obj,
            data=serializer.validated_data,
        )
        output = TeamParticipationPlayerDetailSerializer(
            obj,
            context=self.get_serializer_context(),
        )
        return Response(output.data)
