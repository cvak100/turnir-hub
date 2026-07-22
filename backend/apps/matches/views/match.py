from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.utils import scope_queryset_to_editions
from apps.core.views.catalog import AdminWritableCatalogMixin
from apps.matches.models import EventType, Match, MatchEvent, MatchStatus
from apps.matches.serializers.match import (
    EventTypeSerializer,
    MatchCreateUpdateSerializer,
    MatchDetailSerializer,
    MatchEventCreateUpdateSerializer,
    MatchEventDetailSerializer,
    MatchEventListSerializer,
    MatchListSerializer,
    MatchStatusSerializer,
)
from apps.matches.services.match import MatchEventService, MatchService
from apps.users.permissions import HasMatchPermission, IsDashboardAdmin
from apps.users.permissions.utils import set_action_permission


class MatchViewSet(viewsets.ModelViewSet):
    filterset_fields = ["tournament_phase", "tournament_phase_group", "status"]
    search_fields = [
        "home_team_participation__participation_name",
        "away_team_participation__participation_name",
        "tournament_phase__name",
        "tournament_phase__tournament_edition__name",
        "tournament_phase__tournament_edition__tournament__name",
    ]
    ordering_fields = [
        "match_date",
        "match_number",
        "created_at",
        "tournament_phase__order",
        "tournament_phase__name",
        "tournament_phase__tournament_edition__name",
        "tournament_phase__tournament_edition__tournament__name",
        "home_team_participation__participation_name",
        "id",
        "status__order",
        "status__name",
    ]
    ordering = ["match_date", "tournament_phase__order", "match_number"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        mapping = {
            "create": "match.manage",
            "update": "match.manage",
            "partial_update": "match.result.edit",
            "destroy": "match.manage",
            "start": "match.live.manage",
            "reopen": "match.live.manage",
            "finish": "match.finish",
            "set_penalties": "match.live.manage",
            "set_status": "match.live.manage",
            "bulk_set_status": "match.live.manage",
            "recalculate": "match.live.manage",
        }
        set_action_permission(self, mapping, default="match.manage")
        # Dashboard admins can bulk-manage without edition-scoped match roles.
        if self.action == "bulk_set_status" and IsDashboardAdmin().has_permission(
            self.request, self
        ):
            return [IsDashboardAdmin()]
        if self.action == "destroy" and IsDashboardAdmin().has_permission(
            self.request, self
        ):
            return [IsDashboardAdmin()]
        return [HasMatchPermission()]

    def get_queryset(self):
        qs = Match.objects.select_related(
            "tournament_phase",
            "tournament_phase__tournament_edition",
            "tournament_phase__tournament_edition__tournament",
            "tournament_phase_group",
            "home_team_participation",
            "away_team_participation",
            "status",
            "referee",
        ).all()
        phase = self.request.query_params.get("tournament_phase")
        if phase:
            qs = qs.filter(tournament_phase_id=phase)
        group = self.request.query_params.get("tournament_phase_group")
        if group:
            qs = qs.filter(tournament_phase_group_id=group)
        edition = self.request.query_params.get("tournament_edition")
        if edition:
            qs = qs.filter(tournament_phase__tournament_edition_id=edition)
        if not self.request.user.is_authenticated:
            return qs.filter(tournament_phase__tournament_edition__is_public=True)
        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "tournament_phase__tournament_edition_id",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return MatchListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return MatchCreateUpdateSerializer
        return MatchDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = MatchService.create_match(data=serializer.validated_data)
        output = MatchDetailSerializer(match, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        match = self.get_object()
        serializer = self.get_serializer(match, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        match = MatchService.update_match(
            match=match,
            data=serializer.validated_data,
        )
        output = MatchDetailSerializer(match, context=self.get_serializer_context())
        return Response(output.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        match = MatchEventService.start_match(match=self.get_object())
        return Response(MatchDetailSerializer(match).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        """Finished → live again (so Live Edit can continue)."""
        match = MatchEventService.reopen_match(match=self.get_object())
        return Response(MatchDetailSerializer(match).data)

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        match = MatchEventService.finish_match(match=self.get_object())
        return Response(MatchDetailSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        """Set match status to a tournament-template code (1st half, HT, …)."""
        code = request.data.get("status_code") or request.data.get("code")
        if not code:
            return Response(
                {"status_code": ["Required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        match = MatchEventService.set_match_status(
            match=self.get_object(),
            status_code=str(code),
        )
        return Response(MatchDetailSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="set-penalties")
    def set_penalties(self, request, pk=None):
        """Toggle penalty shootout — prefer set-status=match_penalties."""
        enabled = request.data.get("enabled", True)
        if isinstance(enabled, str):
            enabled = enabled.lower() in ("1", "true", "yes")
        code = "match_penalties" if enabled else "match_second_half"
        match = MatchEventService.set_match_status(
            match=self.get_object(),
            status_code=code,
        )
        return Response(MatchDetailSerializer(match).data)

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        """Rebuild scores (incl. HT/ET/pen) and player stats from events."""
        match = MatchEventService.refresh_match_from_events(match=self.get_object())
        return Response(MatchDetailSerializer(match).data)

    @action(detail=False, methods=["post"], url_path="bulk-set-status")
    def bulk_set_status(self, request):
        """Set status for many matches at once (admin / live manage)."""
        ids = request.data.get("ids") or request.data.get("match_ids") or []
        status_id = request.data.get("status") or request.data.get("status_id")
        if not isinstance(ids, list) or not ids:
            return Response(
                {"ids": ["Provide a non-empty list of match ids."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not status_id:
            return Response(
                {"status": ["Required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            new_status = MatchStatus.objects.get(pk=int(status_id))
        except (MatchStatus.DoesNotExist, TypeError, ValueError):
            return Response(
                {"status": ["Invalid status id."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset().filter(pk__in=ids)
        updated = []
        for match in qs:
            updated.append(
                MatchService.update_match(match=match, data={"status": new_status})
            )
        return Response(
            {
                "ok": True,
                "count": len(updated),
                "matches": MatchListSerializer(updated, many=True).data,
            }
        )


class MatchStatusViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    queryset = MatchStatus.objects.all().order_by("order", "id")
    serializer_class = MatchStatusSerializer
    read_permission_classes = [AllowAny]
    pagination_class = None
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "id"]


class EventTypeViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    """List existing EventType rows for Live / Normal Edit action buttons."""

    queryset = EventType.objects.all().order_by("order", "id")
    serializer_class = EventTypeSerializer
    read_permission_classes = [AllowAny]
    pagination_class = None
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "id"]


class MatchEventViewSet(viewsets.ModelViewSet):
    filterset_fields = [
        "match",
        "event_type",
        "team_participation",
        "player",
        "half",
        "is_temporary_player",
        "is_own_goal",
    ]
    search_fields = [
        "temporary_player_label",
        "player__person__first_name",
        "player__person__last_name",
        "player__person__nickname",
        "match__home_team_participation__participation_name",
        "match__away_team_participation__participation_name",
    ]
    ordering_fields = [
        "minute",
        "extra_minute",
        "created_at",
        "id",
        "half",
        "match_id",
    ]
    ordering = ["minute", "id"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "match.event.add",
                "update": "match.event.edit",
                "partial_update": "match.event.edit",
                "destroy": "match.event.delete",
            },
            default="match.event.add",
        )
        return [HasMatchPermission()]

    def get_queryset(self):
        qs = MatchEvent.objects.select_related(
            "match",
            "match__tournament_phase",
            "match__tournament_phase__tournament_edition",
            "match__home_team_participation",
            "match__away_team_participation",
            "event_type",
            "team_participation",
            "player",
            "player__person",
            "related_player",
            "created_by",
        ).all()
        match_id = self.request.query_params.get("match")
        if match_id:
            qs = qs.filter(match_id=match_id)
        edition = self.request.query_params.get("tournament_edition")
        if edition:
            qs = qs.filter(
                match__tournament_phase__tournament_edition_id=edition
            )
        tournament = self.request.query_params.get("tournament")
        if tournament:
            qs = qs.filter(
                match__tournament_phase__tournament_edition__tournament_id=tournament
            )
        if not self.request.user.is_authenticated:
            return qs.filter(
                match__tournament_phase__tournament_edition__is_public=True
            )
        return scope_queryset_to_editions(
            self.request.user,
            qs,
            "match__tournament_phase__tournament_edition_id",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return MatchEventListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return MatchEventCreateUpdateSerializer
        return MatchEventDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = MatchEventService.create_event(
            data=serializer.validated_data,
            user=request.user,
        )
        output = MatchEventDetailSerializer(
            event,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        event = self.get_object()
        serializer = self.get_serializer(event, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        event = MatchEventService.update_event(
            event=event,
            data=serializer.validated_data,
        )
        output = MatchEventDetailSerializer(
            event,
            context=self.get_serializer_context(),
        )
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        event = self.get_object()
        MatchEventService.delete_event(event=event)
        return Response(status=status.HTTP_204_NO_CONTENT)
