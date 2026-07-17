from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.matches.models import Match
from apps.matches.serializers.match import MatchDetailSerializer, MatchListSerializer
from apps.tournaments.models import Tournament, TournamentEdition
from apps.tournaments.serializers.edition import (
    TournamentEditionDetailSerializer,
    TournamentEditionListSerializer,
)
from apps.tournaments.serializers.tournament import (
    TournamentDetailSerializer,
    TournamentListSerializer,
)


class PublicTournamentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only public tournament endpoints."""

    permission_classes = [AllowAny]
    queryset = (
        Tournament.objects.filter(is_active=True)
        .select_related("sport", "contact_person")
        .all()
    )

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentListSerializer
        return TournamentDetailSerializer


class PublicTournamentEditionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only public edition endpoints."""

    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            TournamentEdition.objects.filter(is_public=True)
            .select_related(
                "tournament",
                "tournament__sport",
                "status",
                "contact_person",
            )
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentEditionListSerializer
        return TournamentEditionDetailSerializer


class PublicMatchViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only matches for public tournament editions."""

    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Match.objects.filter(
                tournament_phase__tournament_edition__is_public=True,
            )
            .select_related(
                "tournament_phase",
                "tournament_phase_group",
                "home_team_participation",
                "away_team_participation",
                "status",
                "referee",
            )
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return MatchListSerializer
        return MatchDetailSerializer
