from django.core.management.base import BaseCommand

from apps.matches.models import EventType

EVENT_TYPES = [
    ("Goal", "goal", 1),
    ("Own Goal", "own_goal", 2),
    ("Assist", "assist", 3),
    ("Yellow Card", "yellow_card", 4),
    ("Red Card", "red_card", 5),
    ("Second Yellow", "second_yellow", 6),
    ("Substitution In", "substitution_in", 7),
    ("Substitution Out", "substitution_out", 8),
    ("Penalty Scored", "penalty_scored", 9),
    ("Penalty Missed", "penalty_missed", 10),
    ("Injury", "injury", 11),
    ("VAR", "var", 12),
    ("Other", "other", 13),
]


class Command(BaseCommand):
    help = "Seed match event types idempotently"

    def handle(self, *args, **options):
        for name, code, order in EVENT_TYPES:
            EventType.objects.update_or_create(
                code=code,
                defaults={"name": name, "order": order, "is_active": True},
            )
            self.stdout.write(f"EventType: {code}")
        self.stdout.write(self.style.SUCCESS("Event type seed completed."))
