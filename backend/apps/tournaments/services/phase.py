from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import ConflictError
from apps.tournaments.models import TournamentPhase


class TournamentPhaseService:
    @staticmethod
    def _validate_unique_order(*, tournament_edition, order, exclude_id=None):
        qs = TournamentPhase.objects.filter(
            tournament_edition=tournament_edition,
            order=order,
        )
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        if qs.exists():
            raise ConflictError("Phase order must be unique within an edition.")

    @staticmethod
    @transaction.atomic
    def create_phase(*, data: dict) -> TournamentPhase:
        TournamentPhaseService._validate_unique_order(
            tournament_edition=data["tournament_edition"],
            order=data["order"],
        )
        return TournamentPhase.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_phase(*, phase: TournamentPhase, data: dict) -> TournamentPhase:
        edition = data.get("tournament_edition", phase.tournament_edition)
        order = data.get("order", phase.order)
        TournamentPhaseService._validate_unique_order(
            tournament_edition=edition,
            order=order,
            exclude_id=phase.pk,
        )
        for attr, value in data.items():
            setattr(phase, attr, value)
        phase.save()
        return phase

    @staticmethod
    def validate_can_delete(*, phase: TournamentPhase):
        if phase.matches.exists():
            raise ValidationError(
                "Cannot delete a phase that already has matches."
            )
        if phase.groups.exists():
            raise ValidationError(
                "Cannot delete a phase that already has groups. "
                "Remove groups first."
            )

    @staticmethod
    @transaction.atomic
    def apply_format_phases(*, edition, tournament_format, replace: bool = False):
        """
        Create default phases from a TournamentFormat.
        If replace=True, delete existing phases first (only if no matches/groups).
        If replace=False and phases already exist, do nothing.
        """
        existing = list(edition.phases.all())
        if existing and not replace:
            return existing

        if existing and replace:
            for phase in existing:
                TournamentPhaseService.validate_can_delete(phase=phase)
            edition.phases.all().delete()

        created = []
        for row in tournament_format.default_phases or []:
            created.append(
                TournamentPhase.objects.create(
                    tournament_edition=edition,
                    name=row.get("name") or row.get("phase_type", "Phase"),
                    phase_type=row["phase_type"],
                    order=int(row.get("order") or (len(created) + 1)),
                    config=row.get("config") or {},
                    is_active=True,
                    status="not_started",
                )
            )
        return created
