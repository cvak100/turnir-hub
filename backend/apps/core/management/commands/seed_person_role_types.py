from django.core.management.base import BaseCommand

from apps.users.models import PersonRoleType

ROLE_TYPES = [
    ("Player", "player", "Igralec / udeleženec tekme.", 1),
    ("Referee", "referee", "Sodnik.", 2),
    ("Coach", "coach", "Trener.", 3),
    ("Contact", "contact", "Kontaktna oseba.", 4),
    ("Staff", "staff", "Organizacijsko osebje.", 5),
    ("Official", "official", "Uradna oseba / delegat.", 6),
    ("Delegate", "delegate", "Delegat.", 7),
    ("Other", "other", "Druga vloga.", 8),
]


class Command(BaseCommand):
    help = "Seed person role types idempotently"

    def handle(self, *args, **options):
        for name, code, description, order in ROLE_TYPES:
            PersonRoleType.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": description,
                    "order": order,
                    "is_active": True,
                },
            )
            self.stdout.write(f"PersonRoleType: {code}")
        self.stdout.write(self.style.SUCCESS("Person role type seed completed."))
