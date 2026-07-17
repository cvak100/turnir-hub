from django.db import models

from .award import Award
from .player import Player
from .team_participation import TeamParticipation


class PlayerAward(models.Model):
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="awards",
    )
    award = models.ForeignKey(
        Award,
        on_delete=models.PROTECT,
        related_name="player_awards",
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        related_name="player_awards",
    )
    team_participation = models.ForeignKey(
        TeamParticipation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="player_awards",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
