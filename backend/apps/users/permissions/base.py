import logging

from rest_framework.permissions import BasePermission

from apps.users.services.permissions import PermissionService

logger = logging.getLogger("turnir.permissions")


class HasPermission(BasePermission):
    """
    Generic global permission class.
    Usage in ViewSet:
        permission_classes = [HasPermission]
        required_permission = "tournament.edit"
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        permission_code = getattr(view, "required_permission", None)
        if permission_code is None:
            return False

        allowed = PermissionService.user_has_permission_anywhere(
            user=request.user,
            permission_code=permission_code,
        )
        if not allowed:
            logger.warning(
                "permission_denied request_id=%s user_id=%s permission=%s path=%s",
                getattr(request, "request_id", None),
                getattr(request.user, "id", None),
                permission_code,
                getattr(request, "path", None),
            )
        return allowed
