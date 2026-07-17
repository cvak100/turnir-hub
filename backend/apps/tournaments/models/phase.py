from django.db import models

from .edition import TournamentEdition


class TournamentPhase(models.Model):
    class PhaseType(models.TextChoices):
        GROUP_STAGE = "GROUP_STAGE", "Group Stage"
        KNOCKOUT = "KNOCKOUT", "Knockout"
        FINAL = "FINAL", "Final"
        THIRD_PLACE = "THIRD_PLACE", "Third Place"
        CUSTOM = "CUSTOM", "Custom"

    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="phases",
    )
    name = models.CharField(max_length=150)
    phase_type = models.CharField(max_length=20, choices=PhaseType.choices)
    order = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default="not_started")
    rules = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("tournament_edition", "order")

    def __str__(self):
        return f"{self.tournament_edition} - {self.name}"
