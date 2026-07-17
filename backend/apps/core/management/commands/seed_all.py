from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run all idempotent seed commands"

    def handle(self, *args, **options):
        call_command("seed_statuses")
        call_command("seed_event_types")
        call_command("seed_roles_permissions")
        call_command("seed_templates")
        self.stdout.write(self.style.SUCCESS("All seeds completed."))
