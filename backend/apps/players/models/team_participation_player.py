from django.db import models

from .player import Player
from .player_status import PlayerStatus
from .team_participation import TeamParticipation


class TeamParticipationPlayer(models.Model):
    team_participation = models.ForeignKey(
        TeamParticipation,
        on_delete=models.CASCADE,
        related_name="players",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="participations",
    )
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    position = models.CharField(max_length=10, blank=True)
    is_captain = models.BooleanField(default=False)
    is_vice_captain = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    status = models.ForeignKey(
        PlayerStatus,
        on_delete=models.PROTECT,
        related_name="participation_players",
    )
    goals = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)
    yellow_cards = models.PositiveIntegerField(default=0)
    red_cards = models.PositiveIntegerField(default=0)
    minutes_played = models.PositiveIntegerField(default=0)
    matches_played = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("team_participation", "player")
