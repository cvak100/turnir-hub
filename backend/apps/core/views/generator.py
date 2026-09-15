from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.services.demo_generator import DemoTournamentGenerator
from apps.core.services.group_knockout_generator import GroupKnockoutGenerator
from apps.core.services.local_2009_demo_generator import Local2009DemoGenerator
from apps.core.services.player_history_generator import PlayerHistoryGenerator
from apps.users.permissions import HasPermission


def _parse_seed(raw):
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise ValueError("seed mora biti celo stevilo.")


class DemoTournamentGeneratorView(APIView):
    """Admin-only: Generator A — full Trojke knockout demo."""

    permission_classes = [HasPermission]
    required_permission = "admin.full_access"

    def post(self, request):
        try:
            seed_int = _parse_seed(request.data.get("seed"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        result = DemoTournamentGenerator.run(user=request.user, seed=seed_int)
        return Response(result, status=status.HTTP_201_CREATED)


class GroupKnockoutGeneratorView(APIView):
    """Admin-only: Generator AA — groups + knockout (12 teams), leaves edition open."""

    permission_classes = [HasPermission]
    required_permission = "admin.full_access"

    def post(self, request):
        try:
            seed_int = _parse_seed(request.data.get("seed"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        result = GroupKnockoutGenerator.run(user=request.user, seed=seed_int)
        return Response(result, status=status.HTTP_201_CREATED)


class PlayerHistoryGeneratorView(APIView):
    """Admin-only: Generator B — sandbox player history across years."""

    permission_classes = [HasPermission]
    required_permission = "admin.full_access"

    def post(self, request):
        try:
            seed_int = _parse_seed(request.data.get("seed"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        player_id = request.data.get("player_id")
        player_id_int = None
        if player_id is not None and str(player_id).strip() != "":
            try:
                player_id_int = int(player_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "player_id mora biti celo stevilo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        years = request.data.get("years", 3)
        try:
            years_int = int(years)
        except (TypeError, ValueError):
            return Response(
                {"detail": "years mora biti celo stevilo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = PlayerHistoryGenerator.run(
            user=request.user,
            player_id=player_id_int,
            years=years_int,
            seed=seed_int,
        )
        return Response(result, status=status.HTTP_201_CREATED)


class Local2009DemoGeneratorView(APIView):
    """Admin-only: Generator C — anonymized local 4+1 demo tournament."""

    permission_classes = [HasPermission]
    required_permission = "admin.full_access"

    def post(self, request):
        result = Local2009DemoGenerator.run(user=request.user)
        return Response(result, status=status.HTTP_201_CREATED)
