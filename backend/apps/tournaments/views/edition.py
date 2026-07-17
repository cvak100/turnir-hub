from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tournaments.models import TournamentEdition
from apps.tournaments.serializers.edition import (
    TournamentEditionCreateSerializer,
    TournamentEditionDetailSerializer,
    TournamentEditionListSerializer,
)
from apps.tournaments.services.edition import TournamentEditionService


class TournamentEditionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TournamentEdition.objects.select_related(
            "tournament",
            "tournament__sport",
            "status",
            "contact_person",
            "global_rule_template",
        ).all()

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
