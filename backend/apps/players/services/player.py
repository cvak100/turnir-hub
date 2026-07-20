from django.db import transaction

from apps.players.models import Player


class PlayerService:
    @staticmethod
    @transaction.atomic
    def create_player(*, data: dict) -> Player:
        return Player.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_player(*, player: Player, data: dict) -> Player:
        for attr, value in data.items():
            setattr(player, attr, value)
        player.save()
        return player
