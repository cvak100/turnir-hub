from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.players.models import TeamParticipation
from apps.players.models.team_status import TeamStatus


class TeamParticipationService:
    @staticmethod
    def _default_status():
        status = TeamStatus.objects.filter(code="pending").first()
        if status is None:
            status = TeamStatus.objects.filter(code="active").first()
        if status is None:
            status = TeamStatus.objects.first()
        return status

    @staticmethod
    @transaction.atomic
    def register_team(*, data: dict) -> TeamParticipation:
        team = data.get("team")
        tournament_edition = data.get("tournament_edition")
        if not team or not tournament_edition:
            raise ValidationError("team and tournament_edition are required.")

        if TeamParticipation.objects.filter(
            team=team,
            tournament_edition=tournament_edition,
        ).exists():
            raise ValidationError(
                "Team is already registered in this edition."
            )

        payload = dict(data)
        participation_name = payload.get("participation_name") or team.name
        if not participation_name:
            raise ValidationError(
                {"participation_name": "This field is required."}
            )
        payload["participation_name"] = participation_name

        if not payload.get("status"):
            default_status = TeamParticipationService._default_status()
            if default_status is None:
                raise ValidationError({"status": "No TeamStatus available."})
            payload["status"] = default_status

        if not payload.get("registered_at"):
            payload["registered_at"] = timezone.now()

        return TeamParticipation.objects.create(**payload)

    @staticmethod
    @transaction.atomic
    def create_participation(*, data: dict) -> TeamParticipation:
        return TeamParticipationService.register_team(data=data)

    @staticmethod
    @transaction.atomic
    def update_participation(
        *,
        participation: TeamParticipation,
        data: dict,
    ) -> TeamParticipation:
        team = data.get("team", participation.team)
        edition = data.get("tournament_edition", participation.tournament_edition)
        conflict = TeamParticipation.objects.filter(
            team=team,
            tournament_edition=edition,
        ).exclude(pk=participation.pk)
        if conflict.exists():
            raise ValidationError(
                "Team is already registered in this edition."
            )

        for attr, value in data.items():
            setattr(participation, attr, value)
        if not participation.participation_name:
            raise ValidationError(
                {"participation_name": "This field is required."}
            )
        participation.save()
        return participation
