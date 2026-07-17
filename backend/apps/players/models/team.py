from django.db import models

from .team_status import TeamStatus


class Team(models.Model):
    name = models.CharField(max_length=150)
    short_name = models.CharField(max_length=50, blank=True)
    logo = models.ImageField(upload_to="teams/logos/", blank=True)
    city = models.CharField(max_length=100, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    shirt_top = models.CharField(max_length=50, blank=True)
    shirt_bottom = models.CharField(max_length=50, blank=True)
    social_links = models.JSONField(null=True, blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_teams",
    )
    sponsors = models.ManyToManyField("tournaments.Sponsor", blank=True)
    notes = models.TextField(blank=True)
    status = models.ForeignKey(
        TeamStatus,
        on_delete=models.PROTECT,
        related_name="teams",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
