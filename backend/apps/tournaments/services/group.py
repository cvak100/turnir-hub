from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.tournaments.models import TournamentPhaseGroup, TournamentPhaseGroupTeam


class TournamentPhaseGroupService:
    @staticmethod
    def _validate_unique_name(*, tournament_phase, name, exclude_id=None):
        qs = TournamentPhaseGroup.objects.filter(
            tournament_phase=tournament_phase,
            name=name,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            raise ValidationError(
                {"name": "Group name must be unique within a phase."}
            )

    @staticmethod
    @transaction.atomic
    def create_group(*, data: dict) -> TournamentPhaseGroup:
        TournamentPhaseGroupService._validate_unique_name(
            tournament_phase=data["tournament_phase"],
            name=data["name"],
        )
        return TournamentPhaseGroup.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_group(
        *,
        group: TournamentPhaseGroup,
        data: dict,
    ) -> TournamentPhaseGroup:
        phase = data.get("tournament_phase", group.tournament_phase)
        name = data.get("name", group.name)
        TournamentPhaseGroupService._validate_unique_name(
            tournament_phase=phase,
            name=name,
            exclude_id=group.pk,
        )
        for attr, value in data.items():
            setattr(group, attr, value)
        group.save()
        return group

    @staticmethod
    def validate_can_delete(*, group: TournamentPhaseGroup):
        if group.group_teams.exists():
            raise ValidationError("Cannot delete a group that still has teams.")
        if group.matches.exists():
            raise ValidationError("Cannot delete a group that has matches.")


class TournamentPhaseGroupTeamService:
    @staticmethod
    def _validate_assignment(*, tournament_phase_group, team_participation, exclude_id=None):
        phase = tournament_phase_group.tournament_phase
        edition = phase.tournament_edition

        if team_participation.tournament_edition_id != edition.id:
            raise ValidationError(
                {
                    "team_participation": (
                        "Team must belong to the same TournamentEdition as the phase."
                    )
                }
            )

        if (
            tournament_phase_group.max_teams is not None
            and tournament_phase_group.group_teams.count()
            >= tournament_phase_group.max_teams
            and exclude_id is None
        ):
            raise ValidationError(
                {"tournament_phase_group": "Group has reached max_teams."}
            )

        qs = TournamentPhaseGroupTeam.objects.filter(
            tournament_phase_group__tournament_phase=phase,
            team_participation=team_participation,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            raise ValidationError(
                {
                    "team_participation": (
                        "Team cannot be placed into two groups of the same phase."
                    )
                }
            )

    @staticmethod
    @transaction.atomic
    def create_group_team(*, data: dict) -> TournamentPhaseGroupTeam:
        TournamentPhaseGroupTeamService._validate_assignment(
            tournament_phase_group=data["tournament_phase_group"],
            team_participation=data["team_participation"],
        )
        return TournamentPhaseGroupTeam.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_group_team(
        *,
        group_team: TournamentPhaseGroupTeam,
        data: dict,
    ) -> TournamentPhaseGroupTeam:
        group = data.get("tournament_phase_group", group_team.tournament_phase_group)
        participation = data.get(
            "team_participation",
            group_team.team_participation,
        )
        TournamentPhaseGroupTeamService._validate_assignment(
            tournament_phase_group=group,
            team_participation=participation,
            exclude_id=group_team.pk,
        )
        for attr, value in data.items():
            setattr(group_team, attr, value)
        group_team.save()
        return group_team
