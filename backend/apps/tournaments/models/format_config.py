from django.db import models

from .edition import TournamentEdition


class TournamentFormatConfig(models.Model):
    """
    Per-edition structure settings for phase/match generation.
    Separate from GlobalRuleTemplate (which is match/game rules).
    """

    class PairingMethod(models.TextChoices):
        AUTO_CROSS = "auto_cross", "Auto cross (A1–B2, A2–B1, …)"
        MANUAL = "manual", "Manual pairing"

    tournament_edition = models.OneToOneField(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="format_config",
    )

    # Group structure
    number_of_groups = models.PositiveSmallIntegerField(default=4)
    teams_per_group = models.PositiveSmallIntegerField(default=4)

    # Advancement from groups
    teams_advancing_per_group = models.PositiveSmallIntegerField(default=2)
    best_runners_up = models.BooleanField(default=False)
    number_of_best_runners_up = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )
    ranking_criteria = models.JSONField(
        default=list,
        blank=True,
        help_text='Ordered list, e.g. ["points","goal_difference","goals_for","head_to_head"]',
    )

    # Timing (scheduling hints; match duration can still come from rule template)
    half_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    half_time_break_minutes = models.PositiveIntegerField(null=True, blank=True)
    buffer_between_matches_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # Knockout
    has_third_place_match = models.BooleanField(default=True)
    pairing_method = models.CharField(
        max_length=20,
        choices=PairingMethod.choices,
        default=PairingMethod.AUTO_CROSS,
    )
    knockout_home_advantage = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tournament format config"
        verbose_name_plural = "Tournament format configs"

    def __str__(self):
        return f"FormatConfig({self.tournament_edition_id})"

    @property
    def expected_advancing_teams(self) -> int:
        base = self.number_of_groups * self.teams_advancing_per_group
        if self.best_runners_up and self.number_of_best_runners_up:
            return base + int(self.number_of_best_runners_up)
        return base
