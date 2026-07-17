from django.conf import settings
from django.db import models

from .event_type import EventType
from .match import Match


class MatchEvent(models.Model):
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.ForeignKey(
        EventType,
        on_delete=models.PROTECT,
        related_name="events",
    )
    minute = models.PositiveIntegerField()
    extra_minute = models.PositiveIntegerField(null=True, blank=True)
    half = models.CharField(max_length=20)
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.CASCADE,
        related_name="events",
    )
    player = models.ForeignKey(
        "players.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    related_player = models.ForeignKey(
        "players.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_events",
    )
    goal_type = models.CharField(max_length=30, blank=True)
    body_part = models.CharField(max_length=20, blank=True)
    is_penalty = models.BooleanField(default=False)
    is_own_goal = models.BooleanField(default=False)
    is_var_decision = models.BooleanField(default=False)
    var_result = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    score_home_at_event = models.PositiveIntegerField(null=True, blank=True)
    score_away_at_event = models.PositiveIntegerField(null=True, blank=True)
    is_temporary_player = models.BooleanField(default=False)
    temporary_player_label = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["minute", "extra_minute", "id"]
