from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.tournaments.models import Tournament


class TournamentService:
    @staticmethod
    @transaction.atomic
    def create_tournament(*, data: dict) -> Tournament:
        if not data.get("name"):
            raise ValidationError({"name": "This field is required."})
        if not data.get("sport"):
            raise ValidationError({"sport": "This field is required."})
        return Tournament.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_tournament(*, tournament: Tournament, data: dict) -> Tournament:
        for attr, value in data.items():
            setattr(tournament, attr, value)
        tournament.save()
        return tournament

    @staticmethod
    @transaction.atomic
    def deactivate_tournament(*, tournament: Tournament) -> Tournament:
        tournament.is_active = False
        tournament.save(update_fields=["is_active", "updated_at"])
        return tournament

    @staticmethod
    def can_hard_delete(*, tournament: Tournament) -> bool:
        return not tournament.editions.exists()
