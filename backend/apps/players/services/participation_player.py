from django.db import transaction

from apps.players.models import TeamParticipationPlayer


class TeamParticipationPlayerService:
    @staticmethod
    @transaction.atomic
    def create_participation_player(*, data: dict) -> TeamParticipationPlayer:
        return TeamParticipationPlayer.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_participation_player(
        *,
        participation_player: TeamParticipationPlayer,
        data: dict,
    ) -> TeamParticipationPlayer:
        for attr, value in data.items():
            setattr(participation_player, attr, value)
        participation_player.save()
        return participation_player
