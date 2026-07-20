from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.services.permissions import PermissionService


class MyPermissionsView(APIView):
    """
    Approach A for frontend: current user roles + permission codes.
    Optional filter: ?edition=5
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = PermissionService.get_user_permission_payload(request.user)
        edition = request.query_params.get("edition")
        if edition and payload.get("user"):
            try:
                edition_id = int(edition)
            except (TypeError, ValueError):
                edition_id = None
            if edition_id is not None:
                roles = payload["user"]["roles"]
                payload["user"]["roles"] = [
                    role
                    for role in roles
                    if role["tournament_edition_id"] in (None, edition_id)
                ]
                payload["effective_permissions"] = sorted(
                    {
                        code
                        for role in payload["user"]["roles"]
                        for code in role["permissions"]
                    }
                )
        return Response(payload)


class MeView(APIView):
    """Current authenticated user profile with roles/permissions."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PermissionService.get_user_permission_payload(request.user))
