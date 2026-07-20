from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.players.models import TeamParticipation
from apps.players.serializers.participation import (
    TeamParticipationCreateUpdateSerializer,
    TeamParticipationDetailSerializer,
    TeamParticipationListSerializer,
)
from apps.players.services.participation import TeamParticipationService
from apps.users.permissions import HasTournamentPermission
from apps.users.permissions.utils import set_action_permission


class TeamParticipationViewSet(viewsets.ModelViewSet):
    permission_classes = [HasTournamentPermission]
    filterset_fields = ["tournament_edition", "team", "status"]
    search_fields = ["participation_name", "team__name"]
    ordering_fields = ["participation_name", "registered_at", "created_at"]
    ordering = ["participation_name"]

    def get_permissions(self):
        set_action_permission(
            self,
            {
                "list": "team.view",
                "retrieve": "team.view",
                "create": "team.participation.manage",
                "update": "team.participation.manage",
                "partial_update": "team.participation.manage",
                "destroy": "team.participation.manage",
            },
            default="team.view",
        )
        return super().get_permissions()

    def get_queryset(self):
        qs = TeamParticipation.objects.select_related(
            "team",
            "team__status",
            "tournament_edition",
            "status",
            "contact_person",
        ).all()
        edition = self.request.query_params.get("tournament_edition")
        if edition:
            qs = qs.filter(tournament_edition_id=edition)
        from apps.core.utils import scope_queryset_to_editions

        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "tournament_edition_id",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TeamParticipationListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TeamParticipationCreateUpdateSerializer
        return TeamParticipationDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participation = TeamParticipationService.create_participation(
            data=serializer.validated_data,
        )
        output = TeamParticipationDetailSerializer(
            participation,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        participation = self.get_object()
        serializer = self.get_serializer(
            participation,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        participation = TeamParticipationService.update_participation(
            participation=participation,
            data=serializer.validated_data,
        )
        output = TeamParticipationDetailSerializer(
            participation,
            context=self.get_serializer_context(),
        )
        return Response(output.data)
