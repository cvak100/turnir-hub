from django.core.management.base import BaseCommand

from apps.matches.models import EventType, MatchStatus


MATCH_STATUSES = [
    ("Scheduled", "scheduled", 1),
    ("Live", "live", 2),
    ("Finished", "finished", 3),
    ("Postponed", "postponed", 4),
    ("Cancelled", "cancelled", 5),
]

EVENT_TYPES = [
    ("Goal", "goal", 1),
    ("Own Goal", "own_goal", 2),
    ("Penalty Scored", "penalty_scored", 3),
    ("Penalty Missed", "penalty_missed", 4),
    ("Assist", "assist", 5),
    ("Yellow Card", "yellow_card", 6),
    ("Red Card", "red_card", 7),
    ("Second Yellow", "second_yellow", 8),
]


class Command(BaseCommand):
    help = "Seed match statuses and event types for live features"

    def handle(self, *args, **options):
        for name, code, order in MATCH_STATUSES:
            MatchStatus.objects.get_or_create(
                code=code,
                defaults={"name": name, "order": order, "is_active": True},
            )
            self.stdout.write(f"MatchStatus: {code}")

        for name, code, order in EVENT_TYPES:
            EventType.objects.get_or_create(
                code=code,
                defaults={"name": name, "order": order, "is_active": True},
            )
            self.stdout.write(f"EventType: {code}")

        self.stdout.write(self.style.SUCCESS("Live seed completed."))
