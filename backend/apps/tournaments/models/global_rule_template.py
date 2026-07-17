from django.db import models


class GlobalRuleTemplate(models.Model):
    name = models.CharField(max_length=150)
    match_duration = models.PositiveIntegerField(null=True, blank=True)
    half_time_duration = models.PositiveIntegerField(null=True, blank=True)
    max_substitutions = models.PositiveIntegerField(null=True, blank=True)
    allow_extra_time = models.BooleanField(default=True)
    allow_penalties = models.BooleanField(default=True)
    max_team_fouls = models.PositiveIntegerField(null=True, blank=True)
    yellow_card_rules = models.TextField(blank=True)
    red_card_rules = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
