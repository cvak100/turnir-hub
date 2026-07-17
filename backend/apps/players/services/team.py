from django.db import transaction

from apps.players.models import Team


class TeamService:
    @staticmethod
    @transaction.atomic
    def create_team(*, data: dict) -> Team:
        return Team.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_team(*, team: Team, data: dict) -> Team:
        for attr, value in data.items():
            setattr(team, attr, value)
        team.save()
        return team
