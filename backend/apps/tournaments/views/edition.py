from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.utils import scope_queryset_to_editions
from apps.tournaments.models import TournamentEdition
from apps.tournaments.serializers.edition import (
    TournamentEditionCreateSerializer,
    TournamentEditionDetailSerializer,
    TournamentEditionListSerializer,
)
from apps.tournaments.services.edition import TournamentEditionService
from apps.users.permissions import HasTournamentPermission
from apps.users.permissions.utils import set_action_permission


class TournamentEditionViewSet(viewsets.ModelViewSet):
    filterset_fields = ["tournament", "status", "year", "is_public"]
    search_fields = ["name", "location"]
    ordering_fields = ["year", "start_date", "name"]
    ordering = ["-year", "name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "edition.create",
                "update": "edition.edit",
                "partial_update": "edition.edit",
                "destroy": "edition.manage",
            },
            default="edition.edit",
        )
        return [HasTournamentPermission()]

    def get_queryset(self):
        qs = TournamentEdition.objects.select_related(
            "tournament",
            "tournament__sport",
            "status",
            "format",
            "contact_person",
            "global_rule_template",
            "category",
        ).all()
        tournament = self.request.query_params.get("tournament")
        if tournament:
            qs = qs.filter(tournament_id=tournament)
        fmt = self.request.query_params.get("format")
        if fmt:
            qs = qs.filter(format_id=fmt)
        if not self.request.user.is_authenticated:
            return qs.filter(is_public=True)
        return scope_queryset_to_editions(self.request.user, qs, "id")

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentEditionListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TournamentEditionCreateSerializer
        return TournamentEditionDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        edition = TournamentEditionService.create_edition(
            data=serializer.validated_data,
            user=request.user,
        )
        output = TournamentEditionDetailSerializer(
            edition,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        edition = self.get_object()
        serializer = self.get_serializer(
            edition,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        edition = TournamentEditionService.update_edition(
            edition=edition,
            data=serializer.validated_data,
        )
        output = TournamentEditionDetailSerializer(
            edition,
            context=self.get_serializer_context(),
        )
        return Response(output.data)
