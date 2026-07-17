from django.conf import settings
from django.db import models

from .role import Role


class UserRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="user_roles",
    )
    tournament_edition = models.ForeignKey(
        "tournaments.TournamentEdition",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "role", "tournament_edition")
