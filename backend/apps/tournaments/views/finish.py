from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.utils import scope_queryset_to_editions
from apps.players.models import Award, PlayerAward
from apps.tournaments.models import Sponsor, TournamentFinalStanding, TournamentPrize
from apps.tournaments.serializers.finish import (
    AwardCreateSerializer,
    AwardSerializer,
    PlayerAwardSerializer,
    PlayerAwardWriteSerializer,
    SponsorSerializer,
    TournamentFinalStandingSerializer,
    TournamentFinalStandingWriteSerializer,
    TournamentPrizeSerializer,
    TournamentPrizeWriteSerializer,
)
from apps.users.permissions import HasPermission, HasTournamentPermission
from apps.users.permissions.utils import set_action_permission


class SponsorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sponsor.objects.filter(is_active=True).order_by("name")
    serializer_class = SponsorSerializer
    search_fields = ["name"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [HasTournamentPermission()]


class AwardViewSet(viewsets.ModelViewSet):
    queryset = Award.objects.all().order_by("order", "name")
    filterset_fields = ["is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name"]
    ordering = ["order", "name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "edition.edit",
                "update": "edition.edit",
                "partial_update": "edition.edit",
                "destroy": "edition.manage",
            },
            default="edition.edit",
        )
        return [HasPermission()]

    def get_serializer_class(self):
        if self.action == "create":
            return AwardCreateSerializer
        return AwardSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        code = data.get("code") or ""
        if not code:
            code = str(data["name"]).strip().lower().replace(" ", "_")[:50]
        else:
            code = str(code).strip().lower().replace(" ", "_")[:50]
        award, _ = Award.objects.get_or_create(
            code=code,
            defaults={
                "name": data["name"],
                "description": data.get("description") or "",
                "order": data.get("order") or Award.objects.count(),
                "is_active": data.get("is_active", True),
            },
        )
        return Response(AwardSerializer(award).data, status=status.HTTP_201_CREATED)


class TournamentFinalStandingViewSet(viewsets.ModelViewSet):
    filterset_fields = ["tournament_edition", "team_participation"]
    ordering_fields = ["position"]
    ordering = ["position"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "edition.edit",
                "update": "edition.edit",
                "partial_update": "edition.edit",
                "destroy": "edition.manage",
            },
            default="edition.edit",
        )
        return [HasTournamentPermission()]

    def get_queryset(self):
        qs = TournamentFinalStanding.objects.select_related(
            "team_participation",
            "team_participation__team",
            "tournament_edition",
        ).all()
        if not self.request.user.is_authenticated:
            return qs.filter(tournament_edition__is_public=True)
        return scope_queryset_to_editions(
            self.request.user, qs, "tournament_edition_id"
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TournamentFinalStandingWriteSerializer
        return TournamentFinalStandingSerializer


class PlayerAwardViewSet(viewsets.ModelViewSet):
    filterset_fields = ["tournament_edition", "player", "award"]
    ordering = ["award__order", "id"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "edition.edit",
                "update": "edition.edit",
                "partial_update": "edition.edit",
                "destroy": "edition.manage",
            },
            default="edition.edit",
        )
        return [HasTournamentPermission()]

    def get_queryset(self):
        qs = PlayerAward.objects.select_related(
            "award",
            "player",
            "player__person",
            "team_participation",
            "tournament_edition",
        ).all()
        if not self.request.user.is_authenticated:
            return qs.filter(tournament_edition__is_public=True)
        return scope_queryset_to_editions(
            self.request.user, qs, "tournament_edition_id"
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PlayerAwardWriteSerializer
        return PlayerAwardSerializer


class TournamentPrizeViewSet(viewsets.ModelViewSet):
    filterset_fields = ["tournament_edition", "prize_type", "recipient_type"]
    ordering = ["id"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "create": "edition.edit",
                "update": "edition.edit",
                "partial_update": "edition.edit",
                "destroy": "edition.manage",
            },
            default="edition.edit",
        )
        return [HasTournamentPermission()]

    def get_queryset(self):
        qs = TournamentPrize.objects.select_related(
            "sponsor",
            "player_award",
            "team_participation",
            "tournament_edition",
        ).all()
        if not self.request.user.is_authenticated:
            return qs.filter(tournament_edition__is_public=True)
        return scope_queryset_to_editions(
            self.request.user, qs, "tournament_edition_id"
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TournamentPrizeWriteSerializer
        return TournamentPrizeSerializer
