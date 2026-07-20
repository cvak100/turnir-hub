"""Helpers to scope querysets by UserRole tournament editions."""

from apps.users.services.permissions import PermissionService


def scope_queryset_to_editions(user, queryset, edition_lookup: str):
    """
    Restrict queryset for scoped-only users.

    edition_lookup examples:
    - "id" for TournamentEdition
    - "tournament_edition_id"
    - "tournament_phase__tournament_edition_id"
    """
    edition_ids = PermissionService.get_accessible_edition_ids(user)
    if edition_ids is None:
        return queryset
    if not edition_ids:
        return queryset.none()
    return queryset.filter(**{f"{edition_lookup}__in": edition_ids})
