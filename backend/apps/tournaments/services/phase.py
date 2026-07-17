from django.db import transaction
from rest_framework.exceptions import ValidationError

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
            raise ValidationError(
                {"order": "Phase order must be unique within an edition."}
            )

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
