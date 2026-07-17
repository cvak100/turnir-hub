from django.db import models

from .edition import TournamentEdition
from .sponsor import Sponsor


class TournamentPrize(models.Model):
    class PrizeType(models.TextChoices):
        MONEY = "money", "Money"
        VOUCHER = "voucher", "Voucher"
        DINNER = "dinner", "Dinner"
        PHYSICAL_GIFT = "physical_gift", "Physical Gift"
        TROPHY = "trophy", "Trophy"
        OTHER = "other", "Other"

    class RecipientType(models.TextChoices):
        PLAYER = "player", "Player"
        TEAM = "team", "Team"
        COACH = "coach", "Coach"
        ALL_PARTICIPANTS = "all_participants", "All Participants"
        OTHER = "other", "Other"

    tournament_edition = models.ForeignKey(
        TournamentEdition,
        on_delete=models.CASCADE,
        related_name="prizes",
    )
    player_award = models.ForeignKey(
        "players.PlayerAward",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes",
    )
    team_participation = models.ForeignKey(
        "players.TeamParticipation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes",
    )
    sponsor = models.ForeignKey(
        Sponsor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prizes",
    )
    prize_type = models.CharField(max_length=30, choices=PrizeType.choices)
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    description = models.TextField(blank=True)
    recipient_type = models.CharField(
        max_length=30,
        choices=RecipientType.choices,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
