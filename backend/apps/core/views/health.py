from django.db import connection
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@extend_schema(tags=["Admin/System"])
class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_status = "ok"
        try:
            connection.ensure_connection()
        except Exception:
            db_status = "error"

        overall = "ok" if db_status == "ok" else "degraded"
        return Response(
            {
                "status": overall,
                "database": db_status,
                "timestamp": timezone.now().isoformat(),
            }
        )
