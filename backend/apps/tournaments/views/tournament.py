from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.tournaments.models import Tournament
from apps.tournaments.serializers.tournament import (
    TournamentCreateUpdateSerializer,
    TournamentDetailSerializer,
    TournamentListSerializer,
)
from apps.tournaments.services.tournament import TournamentService
from apps.users.permissions import HasPermission
from apps.users.permissions.utils import set_action_permission


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.select_related("sport", "contact_person").all()
    filterset_fields = ["sport", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "tournament.create",
                "update": "tournament.edit",
                "partial_update": "tournament.edit",
                "destroy": "tournament.delete",
            },
            default="tournament.edit",
        )
        return [HasPermission()]

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TournamentCreateUpdateSerializer
        return TournamentDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tournament = TournamentService.create_tournament(
            data=serializer.validated_data,
        )
        output = TournamentDetailSerializer(
            tournament,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        tournament = self.get_object()
        serializer = self.get_serializer(
            tournament,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        tournament = TournamentService.update_tournament(
            tournament=tournament,
            data=serializer.validated_data,
        )
        output = TournamentDetailSerializer(
            tournament,
            context=self.get_serializer_context(),
        )
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        tournament = self.get_object()
        if TournamentService.can_hard_delete(tournament=tournament):
            return super().destroy(request, *args, **kwargs)
        tournament = TournamentService.deactivate_tournament(tournament=tournament)
        output = TournamentDetailSerializer(
            tournament,
            context=self.get_serializer_context(),
        )
        return Response(output.data)
