from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.players.models import TeamParticipation
from apps.players.serializers.participation import (
    TeamParticipationCreateUpdateSerializer,
    TeamParticipationDetailSerializer,
    TeamParticipationListSerializer,
)
from apps.players.services.participation import TeamParticipationService


class TeamParticipationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TeamParticipation.objects.select_related(
            "team",
            "team__status",
            "tournament_edition",
            "status",
            "contact_person",
        ).all()

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
