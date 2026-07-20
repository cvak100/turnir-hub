from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import ConflictError, InvalidStateError
from apps.tournaments.models import TournamentPhaseGroup, TournamentPhaseGroupTeam


class TournamentPhaseGroupService:
    GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    @staticmethod
    def _validate_unique_name(*, tournament_phase, name, exclude_id=None):
        qs = TournamentPhaseGroup.objects.filter(
            tournament_phase=tournament_phase,
            name=name,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            raise ConflictError(
                "Group name must be unique within a phase.",
                details={"name": ["Group name must be unique within a phase."]},
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
    def generate_groups(
        *,
        phase,
        number_of_groups: int,
        max_teams=None,
        replace: bool = False,
    ) -> list[TournamentPhaseGroup]:
        """
        Ensure the phase has `number_of_groups` groups.
        - replace=True: delete all and recreate A, B, C…
        - replace=False: if count already matches, leave alone;
          if fewer groups, create only the missing ones (reuse free letters).
        """
        if phase.phase_type != "group_stage":
            raise ValidationError(
                {"phase": "Groups can only be generated for a group_stage phase."}
            )
        if number_of_groups < 1 or number_of_groups > 26:
            raise ValidationError(
                {"number_of_groups": "Must be between 1 and 26."}
            )

        existing = list(phase.groups.order_by("order", "id"))
        if replace and existing:
            for group in existing:
                TournamentPhaseGroupService.delete_group(group=group)
            existing = []

        if len(existing) == number_of_groups:
            # Already correct — optionally sync max_teams
            if max_teams is not None:
                for group in existing:
                    if group.max_teams != max_teams:
                        group.max_teams = max_teams
                        group.save(update_fields=["max_teams", "updated_at"])
            return existing

        if len(existing) > number_of_groups:
            raise ConflictError(
                "Phase has more groups than requested. "
                "Remove extras or pass replace=true.",
            )

        created = []
        letters = TournamentPhaseGroupService.GROUP_LETTERS
        used_names = {g.name for g in existing}
        used_orders = {g.order for g in existing}

        for letter in letters:
            if len(existing) + len(created) >= number_of_groups:
                break
            name = f"Skupina {letter}"
            if name in used_names:
                continue
            order = letters.index(letter) + 1
            if order in used_orders:
                order = max(used_orders) + 1
            created.append(
                TournamentPhaseGroup.objects.create(
                    tournament_phase=phase,
                    name=name,
                    order=order,
                    max_teams=max_teams,
                )
            )
            used_names.add(name)
            used_orders.add(order)

        return list(phase.groups.order_by("order", "id"))

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
        if group.matches.filter(events__isnull=False).distinct().exists():
            raise InvalidStateError(
                "Cannot delete a group that has matches with recorded events."
            )

    @staticmethod
    @transaction.atomic
    def delete_group(*, group: TournamentPhaseGroup):
        """
        Remove a group and its assignments / empty matches.
        Blocks only if matches already have events.
        """
        TournamentPhaseGroupService.validate_can_delete(group=group)
        group.group_teams.all().delete()
        group.matches.all().delete()
        group.delete()


class TournamentPhaseGroupTeamService:
    @staticmethod
    def _validate_assignment(
        *,
        tournament_phase_group,
        team_participation,
        exclude_id=None,
    ):
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
            raise ConflictError(
                "Group has reached max_teams.",
                details={"tournament_phase_group": ["Group has reached max_teams."]},
            )

        qs = TournamentPhaseGroupTeam.objects.filter(
            tournament_phase_group__tournament_phase=phase,
            team_participation=team_participation,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            raise ConflictError(
                "Team cannot be placed into two groups of the same phase.",
                details={
                    "team_participation": [
                        "Team cannot be placed into two groups of the same phase."
                    ]
                },
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
