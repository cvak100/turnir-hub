from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.players.models import Player
from apps.players.serializers.player import (
    PlayerCreateUpdateSerializer,
    PlayerDetailSerializer,
    PlayerListSerializer,
)
from apps.players.services.player import PlayerService
from apps.users.permissions import HasPermission
from apps.users.permissions.utils import set_action_permission


class PlayerViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    queryset = Player.objects.select_related("person", "status").all()
    filterset_fields = ["status", "position", "is_active", "dominant_foot"]
    search_fields = [
        "person__first_name",
        "person__last_name",
        "person__nickname",
        "nationality",
        "=id",
    ]
    ordering_fields = ["created_at", "preferred_jersey_number"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "awards__award",
                "awards__tournament_edition",
                "awards__team_participation__team",
                "awards__prizes__sponsor",
                "participations",
            )
        if not self.request.user.is_authenticated:
            qs = qs.filter(
                person__show_as_anonymous=False,
                participations__team_participation__tournament_edition__is_public=True,
            ).distinct()
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        set_action_permission(
            self,
            {
                "list": "player.view",
                "retrieve": "player.view",
                "create": "player.manage",
                "update": "player.manage",
                "partial_update": "player.manage",
                "destroy": "player.manage",
            },
            default="player.view",
        )
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "list":
            return PlayerListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return PlayerCreateUpdateSerializer
        return PlayerDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        player = PlayerService.create_player(data=serializer.validated_data)
        output = PlayerDetailSerializer(player, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        player = self.get_object()
        serializer = self.get_serializer(player, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        player = PlayerService.update_player(
            player=player,
            data=serializer.validated_data,
        )
        output = PlayerDetailSerializer(player, context=self.get_serializer_context())
        return Response(output.data)
