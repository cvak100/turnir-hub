from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.tournaments.models import TournamentEdition
from apps.tournaments.services.phase import TournamentPhaseService


class TournamentEditionService:
    @staticmethod
    def _validate_dates(data: dict, *, edition: TournamentEdition | None = None):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if edition is not None:
            start_date = data.get("start_date", edition.start_date)
            end_date = data.get("end_date", edition.end_date)
        if start_date and end_date and end_date < start_date:
            raise ValidationError(
                {"end_date": "end_date cannot be before start_date."}
            )

        year = data.get("year")
        if year is None and edition is not None:
            year = edition.year
        if year and start_date and start_date.year != year:
            raise ValidationError(
                {"year": "year should match start_date year when possible."}
            )

    @staticmethod
    @transaction.atomic
    def create_edition(*, data: dict, user) -> TournamentEdition:
        TournamentEditionService._validate_dates(data)
        if not data.get("status"):
            raise ValidationError({"status": "This field is required."})

        payload = dict(data)
        apply_phases = payload.pop("apply_format_phases", True)
        payload.pop("replace_format_phases", None)

        edition = TournamentEdition.objects.create(created_by=user, **payload)

        fmt = edition.format
        if apply_phases and fmt is not None:
            TournamentPhaseService.apply_format_phases(
                edition=edition,
                tournament_format=fmt,
                replace=False,
            )
        return edition

    @staticmethod
    @transaction.atomic
    def update_edition(*, edition: TournamentEdition, data: dict) -> TournamentEdition:
        TournamentEditionService._validate_dates(data, edition=edition)
        payload = dict(data)
        apply_phases = payload.pop("apply_format_phases", False)
        replace_phases = payload.pop("replace_format_phases", False)

        old_format_id = edition.format_id
        for attr, value in payload.items():
            setattr(edition, attr, value)
        edition.save()

        fmt = edition.format
        if fmt is not None and (
            apply_phases
            or replace_phases
            or (edition.format_id != old_format_id and not edition.phases.exists())
        ):
            TournamentPhaseService.apply_format_phases(
                edition=edition,
                tournament_format=fmt,
                replace=bool(replace_phases),
            )
        return edition
