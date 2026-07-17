from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.players.models import TeamParticipationPlayer


class TeamParticipationPlayerService:
    @staticmethod
    def _validate_assignment(
        *,
        team_participation,
        player,
        jersey_number=None,
        is_captain=False,
        exclude_id=None,
    ):
        edition = team_participation.tournament_edition

        already_assigned = TeamParticipationPlayer.objects.filter(
            player=player,
            team_participation__tournament_edition=edition,
        )
        if exclude_id:
            already_assigned = already_assigned.exclude(pk=exclude_id)
        if already_assigned.exists():
            raise ValidationError(
                "Player is already assigned to a team in this edition."
            )

        if not player.is_active:
            raise ValidationError(
                {"player": "Player must be active to be assigned."}
            )

        if jersey_number is not None:
            jersey_qs = TeamParticipationPlayer.objects.filter(
                team_participation=team_participation,
                jersey_number=jersey_number,
            )
            if exclude_id:
                jersey_qs = jersey_qs.exclude(pk=exclude_id)
            if jersey_qs.exists():
                raise ValidationError(
                    {
                        "jersey_number": (
                            "Jersey number must be unique inside one team participation."
                        )
                    }
                )

        if is_captain:
            captain_qs = TeamParticipationPlayer.objects.filter(
                team_participation=team_participation,
                is_captain=True,
            )
            if exclude_id:
                captain_qs = captain_qs.exclude(pk=exclude_id)
            if captain_qs.exists():
                raise ValidationError(
                    {"is_captain": "Only one captain is allowed per team participation."}
                )

    @staticmethod
    @transaction.atomic
    def assign_player(*, data: dict) -> TeamParticipationPlayer:
        team_participation = data.get("team_participation")
        player = data.get("player")
        if not team_participation or not player:
            raise ValidationError(
                "team_participation and player are required."
            )

        TeamParticipationPlayerService._validate_assignment(
            team_participation=team_participation,
            player=player,
            jersey_number=data.get("jersey_number"),
            is_captain=bool(data.get("is_captain", False)),
        )
        return TeamParticipationPlayer.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def create_participation_player(*, data: dict) -> TeamParticipationPlayer:
        return TeamParticipationPlayerService.assign_player(data=data)

    @staticmethod
    @transaction.atomic
    def update_participation_player(
        *,
        participation_player: TeamParticipationPlayer,
        data: dict,
    ) -> TeamParticipationPlayer:
        team_participation = data.get(
            "team_participation",
            participation_player.team_participation,
        )
        player = data.get("player", participation_player.player)
        jersey_number = data.get(
            "jersey_number",
            participation_player.jersey_number,
        )
        is_captain = data.get("is_captain", participation_player.is_captain)

        TeamParticipationPlayerService._validate_assignment(
            team_participation=team_participation,
            player=player,
            jersey_number=jersey_number,
            is_captain=bool(is_captain),
            exclude_id=participation_player.pk,
        )

        for attr, value in data.items():
            setattr(participation_player, attr, value)
        participation_player.save()
        return participation_player
