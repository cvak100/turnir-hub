from django.db import models


class GlobalRuleTemplate(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    # Match basics
    match_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    half_time_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    number_of_halves = models.PositiveSmallIntegerField(default=2)

    # Teams / players
    players_per_team = models.PositiveSmallIntegerField(null=True, blank=True)
    max_players_on_roster = models.PositiveSmallIntegerField(null=True, blank=True)
    unlimited_substitutions = models.BooleanField(default=False)
    max_substitutions = models.PositiveSmallIntegerField(null=True, blank=True)

    # Field / equipment
    field_type = models.CharField(max_length=50, blank=True)
    ball_size = models.PositiveSmallIntegerField(null=True, blank=True)

    # Game rules
    allow_extra_time = models.BooleanField(default=True)
    extra_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    allow_penalties = models.BooleanField(default=True)
    offside_rule = models.BooleanField(default=True)
    max_team_fouls = models.PositiveSmallIntegerField(null=True, blank=True)

    # Discipline
    yellow_card_rules = models.TextField(blank=True)
    red_card_rules = models.TextField(blank=True)

    # Scoring
    points_for_win = models.PositiveSmallIntegerField(default=3)
    points_for_draw = models.PositiveSmallIntegerField(default=1)

    # Other
    full_rules_text = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        help_text="Built-in seed template; cannot be deleted by users.",
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Global rule templates"
        ordering = ["name"]

    def __str__(self):
        return self.name
