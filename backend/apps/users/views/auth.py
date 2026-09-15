from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
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


class ChangePasswordView(APIView):
    """Authenticated user changes own password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password") or ""
        new = request.data.get("new_password") or ""
        confirm = request.data.get("new_password_confirm") or ""

        if not current or not new or not confirm:
            return Response(
                {"detail": "Vnesi trenutno geslo, novo geslo in potrditev."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new != confirm:
            return Response(
                {"detail": "Novo geslo in potrditev se ne ujemata."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current):
            return Response(
                {"detail": "Trenutno geslo ni pravilno."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new, user=request.user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Geslo je spremenjeno."})
