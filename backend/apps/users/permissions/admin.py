from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.services.permissions import PermissionService


class IsDashboardAdmin(BasePermission):
    """Superuser or admin.full_access — matches frontend RequireAdmin."""

    message = "Admin access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return PermissionService.user_has_permission_anywhere(
            user=user,
            permission_code="admin.full_access",
        )


class IsDashboardAdminOrReadOnly(BasePermission):
    """Read for everyone who already could; writes require dashboard admin."""

    message = "Admin access required to modify catalog entries."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsDashboardAdmin().has_permission(request, view)
