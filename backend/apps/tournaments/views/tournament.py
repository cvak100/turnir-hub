from rest_framework import status, viewsets
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
    permission_classes = [HasPermission]

    def get_permissions(self):
        set_action_permission(
            self,
            {
                "list": "tournament.view",
                "retrieve": "tournament.view",
                "create": "tournament.create",
                "update": "tournament.edit",
                "partial_update": "tournament.edit",
                "destroy": "tournament.delete",
            },
            default="tournament.view",
        )
        return super().get_permissions()

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
