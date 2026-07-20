from django.db import transaction

from apps.players.models import Team, TeamStatus


class TeamService:
    @staticmethod
    @transaction.atomic
    def create_team(*, data: dict) -> Team:
        payload = dict(data)
        if payload.get("status") is None:
            payload["status"] = (
                TeamStatus.objects.filter(code="active").first()
                or TeamStatus.objects.order_by("order").first()
            )
        return Team.objects.create(**payload)

    @staticmethod
    @transaction.atomic
    def update_team(*, team: Team, data: dict) -> Team:
        for attr, value in data.items():
            setattr(team, attr, value)
        team.save()
        return team
