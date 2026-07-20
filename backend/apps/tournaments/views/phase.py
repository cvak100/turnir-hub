from rest_framework import status, viewsets
from rest_framework.decorators import action
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
from apps.tournaments.services.group import (
    TournamentPhaseGroupService,
    TournamentPhaseGroupTeamService,
)
from apps.tournaments.services.phase import TournamentPhaseService
from apps.users.permissions import HasTournamentPermission
from apps.users.permissions.utils import set_action_permission


class TournamentPhaseViewSet(viewsets.ModelViewSet):
    permission_classes = [HasTournamentPermission]
    filterset_fields = ["tournament_edition", "phase_type", "status"]
    search_fields = ["name"]
    ordering_fields = ["order", "name", "created_at"]
    ordering = ["order"]

    def get_permissions(self):
        set_action_permission(
            self,
            {
                "list": "phase.manage",
                "retrieve": "phase.manage",
                "create": "phase.manage",
                "update": "phase.manage",
                "partial_update": "phase.manage",
                "destroy": "phase.manage",
                "generate_groups": "phase.manage",
                "generate_matches": "phase.manage",
            },
            default="phase.manage",
        )
        # Allow viewing with edition.view as fallback for list/retrieve
        if self.action in ["list", "retrieve"]:
            self.required_permission = "edition.view"
        return super().get_permissions()

    def get_queryset(self):
        qs = TournamentPhase.objects.select_related("tournament_edition").all()
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

    def destroy(self, request, *args, **kwargs):
        phase = self.get_object()
        TournamentPhaseService.validate_can_delete(phase=phase)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="generate-groups")
    def generate_groups(self, request, pk=None):
        phase = self.get_object()
        number_of_groups = request.data.get("number_of_groups")
        try:
            number_of_groups = int(number_of_groups)
        except (TypeError, ValueError):
            return Response(
                {"number_of_groups": ["This field is required and must be an integer."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        max_teams = request.data.get("max_teams", None)
        if max_teams is not None and max_teams != "":
            try:
                max_teams = int(max_teams)
            except (TypeError, ValueError):
                return Response(
                    {"max_teams": ["Must be an integer or null."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            max_teams = None

        replace = bool(request.data.get("replace", False))
        groups = TournamentPhaseGroupService.generate_groups(
            phase=phase,
            number_of_groups=number_of_groups,
            max_teams=max_teams,
            replace=replace,
        )

        # Keep phase config in sync with what was generated.
        config = dict(phase.config or {})
        config["number_of_groups"] = number_of_groups
        if max_teams is not None:
            config["teams_per_group"] = max_teams
        phase.config = config
        phase.save(update_fields=["config", "updated_at"])

        output = TournamentPhaseGroupListSerializer(
            groups,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="generate-matches")
    def generate_matches(self, request, pk=None):
        from apps.matches.serializers.match import MatchListSerializer
        from apps.matches.services.match import MatchService

        phase = self.get_object()
        replace = bool(request.data.get("replace", False))
        match_count = request.data.get("match_count", None)
        matches = MatchService.generate_placeholder_matches(
            phase=phase,
            replace=replace,
            match_count=match_count,
        )
        output = MatchListSerializer(
            matches,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)


class TournamentPhaseGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [HasTournamentPermission]
    filterset_fields = ["tournament_phase"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.required_permission = "edition.view"
        else:
            self.required_permission = "phase.manage"
        return super().get_permissions()

    def get_queryset(self):
        qs = TournamentPhaseGroup.objects.select_related(
            "tournament_phase",
            "tournament_phase__tournament_edition",
        ).all()
        phase = self.request.query_params.get("tournament_phase")
        if phase:
            qs = qs.filter(tournament_phase_id=phase)
        from apps.core.utils import scope_queryset_to_editions

        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "tournament_phase__tournament_edition_id",
        )

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

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        TournamentPhaseGroupService.delete_group(group=group)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TournamentPhaseGroupTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [HasTournamentPermission]
    filterset_fields = ["tournament_phase_group", "team_participation"]
    ordering_fields = ["points", "goals_for", "played"]
    ordering = ["-points", "-goals_for"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.required_permission = "edition.view"
        else:
            self.required_permission = "phase.manage"
        return super().get_permissions()

    def get_queryset(self):
        qs = TournamentPhaseGroupTeam.objects.select_related(
            "tournament_phase_group",
            "tournament_phase_group__tournament_phase__tournament_edition",
            "team_participation",
        ).all()
        group = self.request.query_params.get("tournament_phase_group")
        if group:
            qs = qs.filter(tournament_phase_group_id=group)
        from apps.core.utils import scope_queryset_to_editions

        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "tournament_phase_group__tournament_phase__tournament_edition_id",
        )

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
