from django.db import transaction

from apps.tournaments.models import (
    TournamentPhase,
    TournamentPhaseGroup,
    TournamentPhaseGroupTeam,
)


class TournamentPhaseService:
    @staticmethod
    @transaction.atomic
    def create_phase(*, data: dict) -> TournamentPhase:
        return TournamentPhase.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_phase(*, phase: TournamentPhase, data: dict) -> TournamentPhase:
        for attr, value in data.items():
            setattr(phase, attr, value)
        phase.save()
        return phase


class TournamentPhaseGroupService:
    @staticmethod
    @transaction.atomic
    def create_group(*, data: dict) -> TournamentPhaseGroup:
        return TournamentPhaseGroup.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_group(
        *,
        group: TournamentPhaseGroup,
        data: dict,
    ) -> TournamentPhaseGroup:
        for attr, value in data.items():
            setattr(group, attr, value)
        group.save()
        return group


class TournamentPhaseGroupTeamService:
    @staticmethod
    @transaction.atomic
    def create_group_team(*, data: dict) -> TournamentPhaseGroupTeam:
        return TournamentPhaseGroupTeam.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_group_team(
        *,
        group_team: TournamentPhaseGroupTeam,
        data: dict,
    ) -> TournamentPhaseGroupTeam:
        for attr, value in data.items():
            setattr(group_team, attr, value)
        group_team.save()
        return group_team
