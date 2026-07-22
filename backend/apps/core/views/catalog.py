"""Mixin: admin can CRUD catalog rows; public/auth keep read access."""

from apps.users.permissions.admin import IsDashboardAdmin


class AdminWritableCatalogMixin:
    """
    Use with ModelViewSet.

    - list/retrieve: keep existing open/auth read policy
    - create/update/destroy: dashboard admin only
    - admin list includes inactive rows
    """

    read_permission_classes = None  # set on subclass
    active_only_for_non_admin = True

    def get_permissions(self):
        if self.action in ("list", "retrieve", "metadata"):
            classes = self.read_permission_classes or []
            return [permission() for permission in classes]
        return [IsDashboardAdmin()]

    def _is_dashboard_admin(self) -> bool:
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return IsDashboardAdmin().has_permission(self.request, self)

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.active_only_for_non_admin:
            return qs
        if self._is_dashboard_admin():
            return qs
        if hasattr(qs.model, "is_active"):
            return qs.filter(is_active=True)
        return qs
