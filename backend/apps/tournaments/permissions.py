from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAuthenticatedDefault(IsAuthenticated):
    """Explicit authenticated permission for ViewSets."""


class IsTournamentEditor(BasePermission):
    """
    Placeholder for Phase 4 role-based object permissions.
    Not enforced yet.
    """

    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated
