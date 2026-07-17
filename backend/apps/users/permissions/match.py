from rest_framework.permissions import BasePermission

from apps.users.permissions.tournament import HasTournamentPermission
from apps.users.services.permissions import PermissionService


class HasMatchPermission(HasTournamentPermission):
    """
    Object-level match permissions.
    Resolves TournamentEdition via match.tournament_phase.
    """

    def has_object_permission(self, request, view, obj):
        permission_code = getattr(view, "required_permission", None)
        if permission_code is None:
            return False

        tournament_edition = PermissionService.resolve_tournament_edition(obj)
        return PermissionService.user_has_permission(
            user=request.user,
            permission_code=permission_code,
            tournament_edition=tournament_edition,
        )
