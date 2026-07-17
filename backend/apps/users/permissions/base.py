from rest_framework.permissions import BasePermission

from apps.users.services.permissions import PermissionService


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

        return PermissionService.user_has_permission(
            user=request.user,
            permission_code=permission_code,
        )
