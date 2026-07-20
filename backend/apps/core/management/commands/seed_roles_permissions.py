from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed roles and permissions (wrapper)"

    def handle(self, *args, **options):
        call_command("seed_permissions")
        self.stdout.write(self.style.SUCCESS("Roles/permissions seed completed."))
