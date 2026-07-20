from django.core.management.base import BaseCommand

from apps.users.models import Country

# code = FIFA/IOC style, iso2 = country-flag-icons key
COUNTRIES = [
    # Core region
    ("Slovenia", "SLO", "SI", 1),
    ("Croatia", "CRO", "HR", 2),
    ("Serbia", "SRB", "RS", 3),
    ("Bosnia and Herzegovina", "BIH", "BA", 4),
    ("Montenegro", "MNE", "ME", 5),
    ("North Macedonia", "MKD", "MK", 6),
    ("Italy", "ITA", "IT", 7),
    ("Austria", "AUT", "AT", 8),
    ("Hungary", "HUN", "HU", 9),
    # Western / South Europe
    ("Germany", "GER", "DE", 10),
    ("France", "FRA", "FR", 11),
    ("Spain", "ESP", "ES", 12),
    ("Portugal", "POR", "PT", 13),
    # British home nations + Ireland
    ("England", "ENG", "GB-ENG", 14),
    ("Scotland", "SCO", "GB-SCT", 15),
    ("Wales", "WAL", "GB-WLS", 16),
    ("Northern Ireland", "NIR", "GB-NIR", 17),
    ("Ireland", "IRL", "IE", 18),
    # Nordic / Scandinavian
    ("Sweden", "SWE", "SE", 19),
    ("Norway", "NOR", "NO", 20),
    ("Denmark", "DEN", "DK", 21),
    ("Finland", "FIN", "FI", 22),
    ("Iceland", "ISL", "IS", 23),
    # East
    ("Russia", "RUS", "RU", 24),
    ("Ukraine", "UKR", "UA", 25),
]

REMOVED_CODES = ("KOS",)


class Command(BaseCommand):
    help = "Seed countries for nationality selection"

    def handle(self, *args, **options):
        for name, code, iso2, order in COUNTRIES:
            Country.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "iso2": iso2,
                    "order": order,
                    "is_active": True,
                },
            )
            self.stdout.write(f"Country: {code} ({iso2})")

        deactivated = Country.objects.filter(code__in=REMOVED_CODES).update(
            is_active=False
        )
        if deactivated:
            self.stdout.write(f"Deactivated: {', '.join(REMOVED_CODES)}")

        self.stdout.write(self.style.SUCCESS("Country seed completed."))
