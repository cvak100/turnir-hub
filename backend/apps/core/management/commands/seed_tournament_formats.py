from django.core.management.base import BaseCommand

from apps.tournaments.models import TournamentFormat

GROUP_CONFIG = {
    "number_of_groups": 4,
    "teams_per_group": 4,
    "teams_advancing_per_group": 2,
    "advancement": {
        "mode": "per_group",
        "teams_per_group": 2,
    },
    "points_for_win": 3,
    "points_for_draw": 1,
    "ranking_criteria": [
        "points",
        "goal_difference",
        "goals_scored",
        "head_to_head",
    ],
}

GROUP_ONLY_CONFIG = {
    **GROUP_CONFIG,
    "teams_advancing_per_group": 0,
    "advancement": {
        "mode": "per_group",
        "teams_per_group": 0,
    },
}

LEAGUE_CONFIG = {
    "home_and_away": True,
    "points_for_win": 3,
    "points_for_draw": 1,
}

# Formats only open zones — user adds knockout rounds / generates groups themselves.
FORMATS = [
    {
        "code": "knockout",
        "name": "Knockout",
        "description": "Samo na izpadanje — runde dodaš sam.",
        "order": 1,
        "default_phases": [],
    },
    {
        "code": "group_knockout",
        "name": "Skupine + Knockout",
        "description": "Odpre skupinski del; knockout runde dodaš sam.",
        "order": 2,
        "default_phases": [
            {
                "name": "Skupinski del",
                "phase_type": "group_stage",
                "order": 1,
                "config": GROUP_CONFIG,
            },
        ],
    },
    {
        "code": "groups_only",
        "name": "Samo skupine",
        "description": "Samo skupinski del, brez izločanja.",
        "order": 3,
        "default_phases": [
            {
                "name": "Skupinski del",
                "phase_type": "group_stage",
                "order": 1,
                "config": GROUP_ONLY_CONFIG,
            },
        ],
    },
    {
        "code": "league",
        "name": "Liga",
        "description": "Ligaški sistem (vsi proti vsem).",
        "order": 4,
        "default_phases": [
            {
                "name": "Liga",
                "phase_type": "league",
                "order": 1,
                "config": LEAGUE_CONFIG,
            },
        ],
    },
    {
        "code": "double_elimination",
        "name": "Dvojno izločanje",
        "description": "Dvojno izločanje — runde dodaš sam.",
        "order": 5,
        "default_phases": [],
    },
    {
        "code": "custom",
        "name": "Po meri",
        "description": "Ročno sestavljene faze (brez avtomatskega ustvarjanja).",
        "order": 6,
        "default_phases": [],
    },
]


class Command(BaseCommand):
    help = "Seed tournament formats idempotently"

    def handle(self, *args, **options):
        for row in FORMATS:
            TournamentFormat.objects.update_or_create(
                code=row["code"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "order": row["order"],
                    "default_phases": row["default_phases"],
                    "is_active": True,
                },
            )
            self.stdout.write(f"TournamentFormat: {row['code']}")
        self.stdout.write(self.style.SUCCESS("Tournament format seed completed."))
