from django.core.management.base import BaseCommand

from apps.tournaments.models import GlobalRuleTemplate, TournamentCategory

CATEGORIES = [
    {"name": "Trojke", "slug": "trojke", "order": 10},
    {"name": "Futsal", "slug": "futsal", "order": 20},
    {"name": "5+1", "slug": "5-plus-1", "order": 30},
    {"name": "Veliki nogomet", "slug": "veliki-nogomet", "order": 40},
    {"name": "Malonogometni", "slug": "malonogometni", "order": 50},
    {"name": "U15", "slug": "u15", "order": 60},
]

TEMPLATES = [
    {
        "name": "Trojke 3v3",
        "description": "Mali format 3 igralci + rezervni",
        "players_per_team": 3,
        "max_players_on_roster": 12,
        "match_duration_minutes": 16,
        "half_time_duration_minutes": 8,
        "number_of_halves": 2,
        "unlimited_substitutions": True,
        "max_substitutions": None,
        "allow_extra_time": False,
        "extra_time_minutes": None,
        "allow_penalties": True,
        "offside_rule": False,
        "field_type": "reduced",
        "ball_size": 4,
        "points_for_win": 3,
        "points_for_draw": 1,
        "max_team_fouls": None,
        "full_rules_text": (
            "Število igralcev: 3 + rezervni (max 12 na ekipo)\n"
            "Trajanje tekme: 2 × 8 minut\n"
            "Velikost igrišča: majhno (približno 20 × 12 m)\n"
            "Žoga: velikost 4\n"
            "Menjave: neomejeno (leteče)\n"
            "Offside: ne\n"
            "Kartoni: poenostavljeni\n"
            "Brez vratarja ali z majhnim golom"
        ),
    },
    {
        "name": "4+1 Futsal",
        "description": "Futsal format 4 igralci + vratar",
        "players_per_team": 5,
        "max_players_on_roster": 20,
        "match_duration_minutes": 40,
        "half_time_duration_minutes": 20,
        "number_of_halves": 2,
        "unlimited_substitutions": True,
        "max_substitutions": None,
        "allow_extra_time": True,
        "extra_time_minutes": 10,
        "allow_penalties": True,
        "offside_rule": False,
        "field_type": "indoor",
        "ball_size": 4,
        "points_for_win": 3,
        "points_for_draw": 1,
        "max_team_fouls": 5,
        "full_rules_text": (
            "Število igralcev: 4 igralci + 1 vratar\n"
            "Trajanje tekme: 2 × 20 minut (efektivni čas)\n"
            "Odmor: 20 minut\n"
            "Velikost igrišča: 38–42 × 20–25 m\n"
            "Žoga: velikost 4\n"
            "Menjave: neomejeno (leteče)\n"
            "Offside: ne\n"
            "Kartoni: rumeni in rdeči (2 rumena = rdeči)"
        ),
    },
    {
        "name": "5+1",
        "description": "Format 5 igralcev + vratar",
        "players_per_team": 6,
        "max_players_on_roster": 25,
        "match_duration_minutes": 40,
        "half_time_duration_minutes": 20,
        "number_of_halves": 2,
        "unlimited_substitutions": True,
        "max_substitutions": None,
        "allow_extra_time": False,
        "extra_time_minutes": None,
        "allow_penalties": True,
        "offside_rule": False,
        "field_type": "reduced",
        "ball_size": 5,
        "points_for_win": 3,
        "points_for_draw": 1,
        "max_team_fouls": None,
        "full_rules_text": (
            "Število igralcev: 5 igralcev + 1 vratar\n"
            "Trajanje tekme: 2 × 20 minut\n"
            "Odmor: 20 minut\n"
            "Velikost igrišča: približno 40 × 20 m\n"
            "Žoga: velikost 4 ali 5\n"
            "Menjave: neomejeno (leteče)\n"
            "Offside: ne"
        ),
    },
    {
        "name": "Veliki nogomet 11v11",
        "description": "Standardni veliki nogomet",
        "players_per_team": 11,
        "max_players_on_roster": 35,
        "match_duration_minutes": 90,
        "half_time_duration_minutes": 15,
        "number_of_halves": 2,
        "unlimited_substitutions": False,
        "max_substitutions": 5,
        "allow_extra_time": True,
        "extra_time_minutes": 30,
        "allow_penalties": True,
        "offside_rule": True,
        "field_type": "full",
        "ball_size": 5,
        "points_for_win": 3,
        "points_for_draw": 1,
        "max_team_fouls": None,
        "full_rules_text": (
            "Število igralcev: 11 + rezervni (max 35 na seznamu)\n"
            "Trajanje tekme: 2 × 45 minut\n"
            "Odmor: 15 minut\n"
            "Velikost igrišča: standardno (105 × 68 m)\n"
            "Žoga: velikost 5\n"
            "Menjave: 5 menjav\n"
            "Offside: da\n"
            "Kartoni: standardna pravila FIFA/NZS"
        ),
    },
]

SYSTEM_NAMES = {row["name"] for row in TEMPLATES}
OBSOLETE_NAMES = {
    "Custom",
    "Trojke",
    "Veliki nogomet",
    "Malonogomet",
    "U15",
}


class Command(BaseCommand):
    help = "Seed tournament categories and built-in global rule templates"

    def handle(self, *args, **options):
        for row in CATEGORIES:
            TournamentCategory.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "order": row["order"],
                    "is_active": True,
                    "description": "",
                },
            )
            self.stdout.write(f"TournamentCategory: {row['name']}")

        for row in TEMPLATES:
            GlobalRuleTemplate.objects.update_or_create(
                name=row["name"],
                defaults={**row, "is_active": True, "is_system": True},
            )
            self.stdout.write(f"GlobalRuleTemplate: {row['name']}")

        obsolete = GlobalRuleTemplate.objects.filter(name__in=OBSOLETE_NAMES)
        if obsolete.exists():
            from apps.tournaments.models import TournamentEdition

            TournamentEdition.objects.filter(
                global_rule_template__in=obsolete,
            ).update(global_rule_template=None)
            deleted, _ = obsolete.delete()
            self.stdout.write(f"Deleted obsolete templates: {deleted}")

        GlobalRuleTemplate.objects.filter(name__in=SYSTEM_NAMES).update(
            is_system=True,
        )

        self.stdout.write(self.style.SUCCESS("Category + rule template seed completed."))
