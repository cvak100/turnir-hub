from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.utils import scope_queryset_to_editions
from apps.matches.models import Match, MatchEvent
from apps.matches.serializers.match import (
    MatchCreateUpdateSerializer,
    MatchDetailSerializer,
    MatchEventCreateUpdateSerializer,
    MatchEventDetailSerializer,
    MatchEventListSerializer,
    MatchListSerializer,
)
from apps.matches.services.match import MatchEventService, MatchService
from apps.users.permissions import HasMatchPermission
from apps.users.permissions.utils import set_action_permission


class MatchViewSet(viewsets.ModelViewSet):
    permission_classes = [HasMatchPermission]

    def get_permissions(self):
        mapping = {
            "list": "match.view",
            "retrieve": "match.view",
            "create": "match.manage",
            "update": "match.manage",
            "partial_update": "match.result.edit",
            "destroy": "match.manage",
            "start": "match.live.manage",
            "finish": "match.finish",
        }
        set_action_permission(self, mapping, default="match.view")
        return super().get_permissions()

    def get_queryset(self):
        qs = Match.objects.select_related(
            "tournament_phase",
            "tournament_phase__tournament_edition",
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
    def finish(self, request, pk=None):
        match = MatchEventService.finish_match(match=self.get_object())
        return Response(MatchDetailSerializer(match).data)


class MatchEventViewSet(viewsets.ModelViewSet):
    permission_classes = [HasMatchPermission]

    def get_permissions(self):
        set_action_permission(
            self,
            {
                "list": "match.view",
                "retrieve": "match.view",
                "create": "match.event.add",
                "update": "match.event.edit",
                "partial_update": "match.event.edit",
                "destroy": "match.event.delete",
            },
            default="match.view",
        )
        return super().get_permissions()

    def get_queryset(self):
        qs = MatchEvent.objects.select_related(
            "match",
            "match__tournament_phase__tournament_edition",
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
