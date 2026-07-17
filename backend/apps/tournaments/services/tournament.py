from django.db import transaction

from apps.tournaments.models import Tournament


class TournamentService:
    @staticmethod
    @transaction.atomic
    def create_tournament(*, data: dict) -> Tournament:
        return Tournament.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_tournament(*, tournament: Tournament, data: dict) -> Tournament:
        for attr, value in data.items():
            setattr(tournament, attr, value)
        tournament.save()
        return tournament
