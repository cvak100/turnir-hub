"""Match visibility helpers shared by REST scoping and WebSocket subscribe."""

from apps.matches.models import Match
from apps.users.services.permissions import PermissionService


def user_can_view_match(user, match: Match) -> bool:
    """
    True if the user may read live updates for this match.

    Rules (spectator-friendly):
    - Public edition → anyone (anon or authenticated)
    - Private edition → authenticated user with access to that edition
      (superuser, global role, or scoped UserRole)
    """
    edition = match.tournament_phase.tournament_edition
    if edition.is_public:
        return True

    if not user or not getattr(user, "is_authenticated", False):
        return False

    edition_ids = PermissionService.get_accessible_edition_ids(user)
    if edition_ids is None:
        return True
    return edition.id in edition_ids
