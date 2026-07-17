from .base import HasPermission
from .match import HasMatchPermission
from .tournament import HasTournamentPermission

__all__ = [
    "HasPermission",
    "HasTournamentPermission",
    "HasMatchPermission",
]
