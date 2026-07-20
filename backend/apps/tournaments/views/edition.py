from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.utils import scope_queryset_to_editions
from apps.matches.serializers.match import MatchListSerializer
from apps.tournaments.models import TournamentEdition
from apps.tournaments.serializers.edition import (
    TournamentEditionCreateSerializer,
    TournamentEditionDetailSerializer,
    TournamentEditionListSerializer,
)
from apps.tournaments.serializers.format_config import (
    TournamentFormatConfigSerializer,
    TournamentFormatConfigUpdateSerializer,
)
from apps.tournaments.serializers.phase import TournamentPhaseDetailSerializer
from apps.tournaments.services.edition import TournamentEditionService
from apps.tournaments.services.format_generation import (
    MatchGenerationService,
    MatchScheduleService,
    TournamentFormatConfigService,
)
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
                "format_config": "edition.edit",
                "generate_structure": "phase.manage",
                "fill_knockout": "phase.manage",
                "generate_group_matches": "phase.manage",
                "schedule_match_times": "match.manage",
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
            "format_config",
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
        TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        edition = self.get_queryset().get(pk=edition.pk)
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
        edition = self.get_queryset().get(pk=edition.pk)
        output = TournamentEditionDetailSerializer(
            edition,
            context=self.get_serializer_context(),
        )
        return Response(output.data)

    @action(detail=True, methods=["get", "patch"], url_path="format-config")
    def format_config(self, request, pk=None):
        edition = self.get_object()
        if request.method.lower() == "get":
            cfg = TournamentFormatConfigService.get_or_create_for_edition(
                edition=edition
            )
            return Response(TournamentFormatConfigSerializer(cfg).data)

        serializer = TournamentFormatConfigUpdateSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        cfg = TournamentFormatConfigService.update_config(
            edition=edition,
            data=serializer.validated_data,
        )
        return Response(TournamentFormatConfigSerializer(cfg).data)

    @action(detail=True, methods=["post"], url_path="generate-structure")
    def generate_structure(self, request, pk=None):
        edition = self.get_object()
        replace = bool(request.data.get("replace", False))
        phases = TournamentFormatConfigService.generate_structure(
            edition=edition,
            replace=replace,
        )
        return Response(
            TournamentPhaseDetailSerializer(phases, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="generate-group-matches")
    def generate_group_matches(self, request, pk=None):
        edition = self.get_object()
        replace = bool(request.data.get("replace", False))
        phase = (
            edition.phases.filter(phase_type="group_stage")
            .order_by("order")
            .first()
        )
        if phase is None:
            return Response(
                {"phases": ["No group_stage phase on this edition."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        matches = MatchGenerationService.generate_group_round_robin(
            phase=phase,
            replace=replace,
        )
        return Response(
            MatchListSerializer(matches, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="fill-knockout")
    def fill_knockout(self, request, pk=None):
        edition = self.get_object()
        replace = bool(request.data.get("replace", False))
        force = bool(request.data.get("force", False))
        matches = MatchGenerationService.fill_knockout(
            edition=edition,
            replace=replace,
            force=force,
        )
        return Response(
            MatchListSerializer(matches, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="schedule-match-times")
    def schedule_match_times(self, request, pk=None):
        """
        Assign sequential kickoff times starting from edition start (or given datetime).
        Body:
          start_datetime (ISO, optional)
          start_time (HH:MM, optional — uses edition.start_date)
          match_ids (optional list)
          only_unscheduled (bool)
          overwrite (bool, default true)
        """
        from datetime import datetime, time

        from django.utils import timezone
        from django.utils.dateparse import parse_datetime

        edition = self.get_object()
        start_datetime = None
        raw = request.data.get("start_datetime")
        if raw:
            start_datetime = parse_datetime(str(raw))
            if start_datetime is None:
                return Response(
                    {"start_datetime": ["Invalid datetime."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        start_time = request.data.get("start_time")
        if start_datetime is None and start_time:
            try:
                parts = str(start_time).strip().split(":")
                hh, mm = int(parts[0]), int(parts[1])
                start_datetime = timezone.make_aware(
                    datetime.combine(edition.start_date, time(hh, mm)),
                    timezone.get_current_timezone(),
                )
            except (ValueError, IndexError, TypeError):
                return Response(
                    {"start_time": ["Expected HH:MM."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        match_ids = request.data.get("match_ids")
        if match_ids is not None and not isinstance(match_ids, list):
            return Response(
                {"match_ids": ["Expected a list of ids."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        only_unscheduled = bool(request.data.get("only_unscheduled", False))
        overwrite = request.data.get("overwrite", True)
        if isinstance(overwrite, str):
            overwrite = overwrite.lower() in ("1", "true", "yes")

        matches = MatchScheduleService.schedule_from_start(
            edition=edition,
            start_datetime=start_datetime,
            match_ids=[int(x) for x in match_ids] if match_ids else None,
            only_unscheduled=only_unscheduled,
            overwrite=bool(overwrite),
        )
        return Response(MatchListSerializer(matches, many=True).data)
