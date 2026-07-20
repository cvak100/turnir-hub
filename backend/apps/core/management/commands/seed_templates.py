from django.core.management.base import BaseCommand

from apps.tournaments.models import Template

TEMPLATES = [
    ("Phase Type Group Stage", "phase_type.group_stage", "phase_type", {"value": "group_stage"}),
    ("Phase Type Knockout", "phase_type.knockout", "phase_type", {"value": "knockout"}),
    ("Phase Type Third Place", "phase_type.third_place", "phase_type", {"value": "third_place"}),
    ("Phase Type League", "phase_type.league", "phase_type", {"value": "league"}),
    ("Half First", "half.first", "half", {"value": "1"}),
    ("Half Second", "half.second", "half", {"value": "2"}),
    ("Half Extra 1", "half.et1", "half", {"value": "ET1"}),
    ("Half Extra 2", "half.et2", "half", {"value": "ET2"}),
    ("Goal Open Play", "goal_type.open_play", "goal_type", {"value": "open_play"}),
    ("Goal Header", "goal_type.header", "goal_type", {"value": "header"}),
    ("Body Part Right Foot", "body_part.right_foot", "body_part", {"value": "right"}),
    ("Body Part Left Foot", "body_part.left_foot", "body_part", {"value": "left"}),
    ("Body Part Head", "body_part.head", "body_part", {"value": "head"}),
    ("Prize Money", "prize_type.money", "prize_type", {"value": "money"}),
    ("Prize Trophy", "prize_type.trophy", "prize_type", {"value": "trophy"}),
    ("Position GK", "position.gk", "position", {"value": "GK"}),
    ("Position DF", "position.df", "position", {"value": "DF"}),
    ("Position MF", "position.mf", "position", {"value": "MF"}),
    ("Position FW", "position.fw", "position", {"value": "FW"}),
    ("Dominant Foot Right", "dominant_foot.right", "dominant_foot", {"value": "right"}),
    ("Dominant Foot Left", "dominant_foot.left", "dominant_foot", {"value": "left"}),
    ("Dominant Foot Both", "dominant_foot.both", "dominant_foot", {"value": "both"}),
    ("Default Match Duration", "settings.match_duration", "global_settings", {"minutes": 90}),
]


class Command(BaseCommand):
    help = "Seed Template enum-like values idempotently"

    def handle(self, *args, **options):
        for index, (name, code, template_type, value) in enumerate(TEMPLATES, start=1):
            Template.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "template_type": template_type,
                    "value": value,
                    "order": index,
                    "is_active": True,
                },
            )
            self.stdout.write(f"Template: {code}")
        self.stdout.write(self.style.SUCCESS("Template seed completed."))
