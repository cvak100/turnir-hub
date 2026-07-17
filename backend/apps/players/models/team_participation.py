from django.db import models

from .team import Team
from .team_status import TeamStatus


class TeamParticipation(models.Model):
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="participations",
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        related_name="team_participations",
    )
    participation_name = models.CharField(max_length=150)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_participations",
    )
    sponsors = models.ManyToManyField("tournaments.Sponsor", blank=True)
    payment_status = models.BooleanField(default=False)
    status = models.ForeignKey(
        TeamStatus,
        on_delete=models.PROTECT,
        related_name="participations",
    )
    registered_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("team", "tournament_edition")

    def __str__(self):
        return self.participation_name
