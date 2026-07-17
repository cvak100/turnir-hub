from rest_framework.permissions import BasePermission

from apps.tournaments.models import TournamentEdition, TournamentPhase
from apps.users.services.permissions import PermissionService


class HasTournamentPermission(BasePermission):
    """
    Checks permission against a TournamentEdition (object-level).
    For create actions, tries to resolve edition from request data.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        permission_code = getattr(view, "required_permission", None)
        if permission_code is None:
            return False

        if view.action == "list":
            edition = self._edition_from_request(request, view)
            if edition is not None:
                return PermissionService.user_has_permission(
                    user=request.user,
                    permission_code=permission_code,
                    tournament_edition=edition,
                )
            return PermissionService.user_has_permission_anywhere(
                user=request.user,
                permission_code=permission_code,
            )

        if view.action == "create":
            edition = self._edition_from_request(request, view)
            return PermissionService.user_has_permission(
                user=request.user,
                permission_code=permission_code,
                tournament_edition=edition,
            )

        # retrieve/update/destroy: object check in has_object_permission
        return True

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

    @staticmethod
    def _edition_from_request(request, view):
        data = request.data if hasattr(request, "data") else {}
        query = request.query_params if hasattr(request, "query_params") else {}

        edition_id = (
            data.get("tournament_edition")
            or query.get("tournament_edition")
            or query.get("edition")
        )
        if edition_id:
            try:
                return TournamentEdition.objects.get(pk=edition_id)
            except (TournamentEdition.DoesNotExist, TypeError, ValueError):
                return edition_id

        phase_id = data.get("tournament_phase")
        if phase_id:
            try:
                phase = TournamentPhase.objects.select_related(
                    "tournament_edition",
                ).get(pk=phase_id)
                return phase.tournament_edition
            except TournamentPhase.DoesNotExist:
                return None

        match_id = data.get("match")
        if match_id:
            from apps.matches.models import Match

            try:
                match = Match.objects.select_related(
                    "tournament_phase__tournament_edition",
                ).get(pk=match_id)
                return match.tournament_phase.tournament_edition
            except Match.DoesNotExist:
                return None

        return None
