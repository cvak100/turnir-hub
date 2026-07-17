from django.db import models

from .match_status import MatchStatus


class Match(models.Model):
    tournament_phase = models.ForeignKey(
        "tournaments.TournamentPhase",
        on_delete=models.CASCADE,
        related_name="matches",
    )
    tournament_phase_group = models.ForeignKey(
        "tournaments.TournamentPhaseGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    home_team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="home_matches",
    )
    away_team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="away_matches",
    )
    match_number = models.PositiveIntegerField(null=True, blank=True)
    match_date = models.DateTimeField(null=True, blank=True)
    status = models.ForeignKey(
        MatchStatus,
        on_delete=models.PROTECT,
        related_name="matches",
    )
    home_score = models.PositiveIntegerField(null=True, blank=True)
    away_score = models.PositiveIntegerField(null=True, blank=True)
    halftime_home_score = models.PositiveIntegerField(null=True, blank=True)
    halftime_away_score = models.PositiveIntegerField(null=True, blank=True)
    extra_time_home_score = models.PositiveIntegerField(null=True, blank=True)
    extra_time_away_score = models.PositiveIntegerField(null=True, blank=True)
    home_score_penalties = models.PositiveIntegerField(null=True, blank=True)
    away_score_penalties = models.PositiveIntegerField(null=True, blank=True)
    is_extra_time = models.BooleanField(default=False)
    is_penalties = models.BooleanField(default=False)
    is_walkover = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    attendance = models.PositiveIntegerField(null=True, blank=True)
    referee = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refereed_matches",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        home = self.home_team_participation or "TBD"
        away = self.away_team_participation or "TBD"
        return f"{home} vs {away}"
