from django.db import transaction

from apps.players.models import TeamParticipation


class TeamParticipationService:
    @staticmethod
    @transaction.atomic
    def create_participation(*, data: dict) -> TeamParticipation:
        return TeamParticipation.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_participation(
        *,
        participation: TeamParticipation,
        data: dict,
    ) -> TeamParticipation:
        for attr, value in data.items():
            setattr(participation, attr, value)
        participation.save()
        return participation
