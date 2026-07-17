from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tournaments.models import (
    TournamentPhase,
    TournamentPhaseGroup,
    TournamentPhaseGroupTeam,
)
from apps.tournaments.serializers.phase import (
    TournamentPhaseCreateUpdateSerializer,
    TournamentPhaseDetailSerializer,
    TournamentPhaseGroupCreateUpdateSerializer,
    TournamentPhaseGroupDetailSerializer,
    TournamentPhaseGroupListSerializer,
    TournamentPhaseGroupTeamCreateUpdateSerializer,
    TournamentPhaseGroupTeamDetailSerializer,
    TournamentPhaseGroupTeamListSerializer,
    TournamentPhaseListSerializer,
)
from apps.tournaments.services.phase import (
    TournamentPhaseGroupService,
    TournamentPhaseGroupTeamService,
    TournamentPhaseService,
)


class TournamentPhaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TournamentPhase.objects.select_related("tournament_edition").all()

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentPhaseListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TournamentPhaseCreateUpdateSerializer
        return TournamentPhaseDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phase = TournamentPhaseService.create_phase(data=serializer.validated_data)
        output = TournamentPhaseDetailSerializer(
            phase,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        phase = self.get_object()
        serializer = self.get_serializer(phase, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        phase = TournamentPhaseService.update_phase(
            phase=phase,
            data=serializer.validated_data,
        )
        output = TournamentPhaseDetailSerializer(
            phase,
            context=self.get_serializer_context(),
        )
        return Response(output.data)


class TournamentPhaseGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TournamentPhaseGroup.objects.select_related("tournament_phase").all()

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentPhaseGroupListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TournamentPhaseGroupCreateUpdateSerializer
        return TournamentPhaseGroupDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = TournamentPhaseGroupService.create_group(
            data=serializer.validated_data,
        )
        output = TournamentPhaseGroupDetailSerializer(
            group,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        group = self.get_object()
        serializer = self.get_serializer(group, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        group = TournamentPhaseGroupService.update_group(
            group=group,
            data=serializer.validated_data,
        )
        output = TournamentPhaseGroupDetailSerializer(
            group,
            context=self.get_serializer_context(),
        )
        return Response(output.data)


class TournamentPhaseGroupTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TournamentPhaseGroupTeam.objects.select_related(
            "tournament_phase_group",
            "team_participation",
        ).all()

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentPhaseGroupTeamListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TournamentPhaseGroupTeamCreateUpdateSerializer
        return TournamentPhaseGroupTeamDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = TournamentPhaseGroupTeamService.create_group_team(
            data=serializer.validated_data,
        )
        output = TournamentPhaseGroupTeamDetailSerializer(
            obj,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        obj = self.get_object()
        serializer = self.get_serializer(obj, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        obj = TournamentPhaseGroupTeamService.update_group_team(
            group_team=obj,
            data=serializer.validated_data,
        )
        output = TournamentPhaseGroupTeamDetailSerializer(
            obj,
            context=self.get_serializer_context(),
        )
        return Response(output.data)
