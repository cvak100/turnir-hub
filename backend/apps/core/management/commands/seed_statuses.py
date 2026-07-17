from django.core.management.base import BaseCommand

from apps.matches.models import MatchStatus
from apps.players.models import PlayerStatus, TeamStatus
from apps.tournaments.models import TournamentStatus
from apps.users.models import PersonStatus

STATUSES = {
    PersonStatus: [
        ("Active", "active", "#22c55e", 1),
        ("Inactive", "inactive", "#94a3b8", 2),
        ("Blocked", "blocked", "#ef4444", 3),
    ],
    TournamentStatus: [
        ("Draft", "draft", "#94a3b8", 1),
        ("Registration", "registration", "#3b82f6", 2),
        ("Ongoing", "ongoing", "#22c55e", 3),
        ("Finished", "finished", "#64748b", 4),
        ("Cancelled", "cancelled", "#ef4444", 5),
    ],
    TeamStatus: [
        ("Pending", "pending", "#f59e0b", 0),
        ("Active", "active", "#22c55e", 1),
        ("Approved", "approved", "#16a34a", 2),
        ("Withdrawn", "withdrawn", "#94a3b8", 3),
    ],
    PlayerStatus: [
        ("Active", "active", "#22c55e", 1),
        ("Injured", "injured", "#f59e0b", 2),
        ("Inactive", "inactive", "#94a3b8", 3),
    ],
    MatchStatus: [
        ("Scheduled", "scheduled", "#3b82f6", 1),
        ("Live", "live", "#ef4444", 2),
        ("Finished", "finished", "#64748b", 3),
        ("Postponed", "postponed", "#f59e0b", 4),
        ("Cancelled", "cancelled", "#94a3b8", 5),
    ],
}


class Command(BaseCommand):
    help = "Seed status lookup tables idempotently"

    def handle(self, *args, **options):
        for model, rows in STATUSES.items():
            for name, code, color, order in rows:
                model.objects.update_or_create(
                    code=code,
                    defaults={
                        "name": name,
                        "color": color,
                        "order": order,
                        "is_active": True,
                    },
                )
                self.stdout.write(f"{model.__name__}: {code}")
        self.stdout.write(self.style.SUCCESS("Status seed completed."))
