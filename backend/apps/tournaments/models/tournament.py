from django.db import models

from .sponsor import Sponsor
from .sport import Sport


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    sport = models.ForeignKey(
        Sport,
        on_delete=models.PROTECT,
        related_name="tournaments",
    )
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="tournaments/logos/", blank=True)
    contact_person = models.ForeignKey(
        "users.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_for_tournaments",
    )
    sponsors = models.ManyToManyField(Sponsor, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
