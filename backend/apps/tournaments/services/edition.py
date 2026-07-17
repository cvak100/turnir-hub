from django.db import transaction

from apps.tournaments.models import TournamentEdition


class TournamentEditionService:
    @staticmethod
    @transaction.atomic
    def create_edition(*, data: dict, user) -> TournamentEdition:
        return TournamentEdition.objects.create(created_by=user, **data)

    @staticmethod
    @transaction.atomic
    def update_edition(*, edition: TournamentEdition, data: dict) -> TournamentEdition:
        for attr, value in data.items():
            setattr(edition, attr, value)
        edition.save()
        return edition
