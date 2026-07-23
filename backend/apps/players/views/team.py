from django.db.models import Count, IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.players.models import Team, TeamParticipation, TeamParticipationPlayer
from apps.players.serializers.team import (
    TeamCreateUpdateSerializer,
    TeamDetailSerializer,
    TeamListSerializer,
)
from apps.players.services.team import TeamService
from apps.users.permissions import HasPermission
from apps.users.permissions.utils import set_action_permission


def _annotate_team_counts(qs, *, public_only: bool):
    appearances = TeamParticipation.objects.filter(team_id=OuterRef("pk"))
    players = TeamParticipationPlayer.objects.filter(
        team_participation__team_id=OuterRef("pk"),
    )
    if public_only:
        appearances = appearances.filter(tournament_edition__is_public=True)
        players = players.filter(
            team_participation__tournament_edition__is_public=True,
        )

    appearances_sq = (
        appearances.order_by()
        .values("team_id")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )
    players_sq = (
        players.order_by()
        .values("team_participation__team_id")
        .annotate(c=Count("player_id", distinct=True))
        .values("c")[:1]
    )
    return qs.annotate(
        appearances_count=Coalesce(
            Subquery(appearances_sq, output_field=IntegerField()),
            0,
        ),
        players_count=Coalesce(
            Subquery(players_sq, output_field=IntegerField()),
            0,
        ),
    )


class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    queryset = Team.objects.select_related("status", "contact_person").all()
    filterset_fields = ["status", "city"]
    search_fields = ["name", "short_name", "city"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
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

    def get_queryset(self):
        qs = super().get_queryset()
        public_only = not getattr(self.request.user, "is_authenticated", False)

        if self.action in ("list", "retrieve") and public_only:
            qs = qs.filter(
                participations__tournament_edition__is_public=True
            ).distinct()

        if self.action == "list":
            qs = _annotate_team_counts(qs, public_only=public_only)
        return qs

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
