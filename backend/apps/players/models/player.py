from django.db import models

from .player_status import PlayerStatus


class Player(models.Model):
    person = models.OneToOneField(
        "users.Person",
        on_delete=models.CASCADE,
        related_name="player",
    )
    position = models.CharField(max_length=10, blank=True)
    preferred_jersey_number = models.PositiveIntegerField(null=True, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.PositiveIntegerField(null=True, blank=True)
    dominant_foot = models.CharField(max_length=10, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(upload_to="players/photos/", blank=True)
    biography = models.TextField(blank=True)
    social_links = models.JSONField(null=True, blank=True)
    status = models.ForeignKey(
        PlayerStatus,
        on_delete=models.PROTECT,
        related_name="players",
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.person)
