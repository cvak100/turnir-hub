"""Helpers to scope querysets by UserRole tournament editions."""

from django.db.models import Q

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


def scope_public_or_accessible(user, queryset, *, public_lookup: str, edition_lookup: str):
    """
    Public read queryset: always include public editions; authenticated users
    with roles also see their private editions.

    public_lookup examples:
    - "is_public" (TournamentEdition)
    - "tournament_edition__is_public"
    - "tournament_phase__tournament_edition__is_public"
    """
    public_q = Q(**{public_lookup: True})
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.filter(public_q)

    edition_ids = PermissionService.get_accessible_edition_ids(user)
    if edition_ids is None:
        return queryset
    if not edition_ids:
        return queryset.filter(public_q)
    return queryset.filter(public_q | Q(**{f"{edition_lookup}__in": edition_ids}))
