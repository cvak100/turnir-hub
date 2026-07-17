from django.conf import settings
from django.db import models

from .global_rule_template import GlobalRuleTemplate
from .sponsor import Sponsor
from .tournament import Tournament
from .tournament_status import TournamentStatus


class TournamentEdition(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="editions",
    )
    name = models.CharField(max_length=200)
    year = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    max_teams = models.PositiveIntegerField(null=True, blank=True)
    max_players_per_team = models.PositiveIntegerField(null=True, blank=True)
    status = models.ForeignKey(
        TournamentStatus,
        on_delete=models.PROTECT,
        related_name="editions",
    )
    public_rules = models.TextField(blank=True)
    configuration = models.JSONField(null=True, blank=True)
    global_rule_template = models.ForeignKey(
        GlobalRuleTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="editions",
    )
    location = models.CharField(max_length=200, blank=True)
    cover_image = models.ImageField(upload_to="tournaments/covers/", blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_editions",
    )
    entry_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    social_links = models.JSONField(null=True, blank=True)
    sponsors = models.ManyToManyField(Sponsor, blank=True)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_editions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "name"]

    def __str__(self):
        return f"{self.name} ({self.year})"
