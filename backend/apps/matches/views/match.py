from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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


class MatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Match.objects.select_related(
            "tournament_phase",
            "tournament_phase_group",
            "home_team_participation",
            "away_team_participation",
            "status",
            "referee",
        ).all()

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


class MatchEventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MatchEvent.objects.select_related(
            "match",
            "event_type",
            "team_participation",
            "player",
            "player__person",
            "related_player",
            "created_by",
        ).all()

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
