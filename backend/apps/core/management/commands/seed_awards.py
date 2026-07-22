from django.core.management.base import BaseCommand

from apps.players.models import Award

DEFAULT_AWARDS = [
    ("MVP", "mvp", "Najboljši igralec turnirja", 1),
    ("Najboljši strelec", "top_scorer", "Igralec z največ goli", 2),
    ("Najboljši vratar", "best_goalkeeper", "Najboljši vratar", 3),
    ("Najboljši branilec", "best_defender", "Najboljši branilec", 4),
    ("Fair play", "fair_play", "Fair play nagrada", 5),
]


class Command(BaseCommand):
    help = "Seed default player award types (MVP, top scorer, …)"

    def handle(self, *args, **options):
        created = 0
        for name, code, description, order in DEFAULT_AWARDS:
            _, was_created = Award.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": description,
                    "order": order,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Awards ready ({created} created, "
                f"{Award.objects.filter(is_active=True).count()} active)."
            )
        )
