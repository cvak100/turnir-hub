from django.db import models

from .edition import TournamentEdition


class TournamentFinalStanding(models.Model):
    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="final_standings",
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="final_standings",
    )
    position = models.PositiveIntegerField()
    matches_played = models.PositiveIntegerField(null=True, blank=True)
    wins = models.PositiveIntegerField(null=True, blank=True)
    draws = models.PositiveIntegerField(null=True, blank=True)
    losses = models.PositiveIntegerField(null=True, blank=True)
    points = models.IntegerField(null=True, blank=True)
    goals_for = models.PositiveIntegerField(null=True, blank=True)
    goals_against = models.PositiveIntegerField(null=True, blank=True)
    goal_difference = models.IntegerField(null=True, blank=True)
    qualification = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position"]
        unique_together = ("tournament_edition", "team_participation")
