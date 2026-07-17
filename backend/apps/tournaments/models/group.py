from django.db import models

from .phase import TournamentPhase


class TournamentPhaseGroup(models.Model):
    tournament_phase = models.ForeignKey(
        TournamentPhase,
        on_delete=models.CASCADE,
        related_name="groups",
    )
    name = models.CharField(max_length=50)
    order = models.PositiveIntegerField()
    max_teams = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.tournament_phase.name} - {self.name}"


class TournamentPhaseGroupTeam(models.Model):
    tournament_phase_group = models.ForeignKey(
        TournamentPhaseGroup,
        on_delete=models.CASCADE,
        related_name="group_teams",
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    order = models.PositiveIntegerField(null=True, blank=True)
    played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    points = models.IntegerField(default=0)
    goals_for = models.PositiveIntegerField(default=0)
    goals_against = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tournament_phase_group", "team_participation")
