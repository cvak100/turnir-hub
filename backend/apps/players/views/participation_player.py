from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.players.models import TeamParticipationPlayer
from apps.players.serializers.participation_player import (
    TeamParticipationPlayerCreateUpdateSerializer,
    TeamParticipationPlayerDetailSerializer,
    TeamParticipationPlayerListSerializer,
)
from apps.players.services.participation_player import TeamParticipationPlayerService


class TeamParticipationPlayerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TeamParticipationPlayer.objects.select_related(
            "team_participation",
            "player",
            "player__person",
            "player__status",
            "status",
        ).all()

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
