from apps.users.permissions.tournament import HasTournamentPermission


class HasMatchPermission(HasTournamentPermission):
    """
    Object-level match permissions.
    Resolves TournamentEdition via match.tournament_phase.
    """
