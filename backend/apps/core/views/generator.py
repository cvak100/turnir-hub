from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.services.demo_generator import DemoTournamentGenerator
from apps.users.permissions import HasPermission


class DemoTournamentGeneratorView(APIView):
    """Admin-only: generate a full Trojke knockout demo tournament."""

    permission_classes = [HasPermission]
    required_permission = "admin.full_access"

    def post(self, request):
        seed = request.data.get("seed")
        seed_int = None
        if seed is not None and str(seed).strip() != "":
            try:
                seed_int = int(seed)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "seed mora biti celo stevilo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        result = DemoTournamentGenerator.run(user=request.user, seed=seed_int)
        return Response(result, status=status.HTTP_201_CREATED)
