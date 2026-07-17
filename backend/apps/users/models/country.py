from django.db import models


class Country(models.Model):
    """Citizenship / nationality lookup (FIFA-style code + ISO2 for flags)."""

    name = models.CharField(max_length=100)
    code = models.CharField(
        max_length=3,
        unique=True,
        help_text="Short code, e.g. SLO",
    )
    iso2 = models.CharField(
        max_length=10,
        unique=True,
        help_text="Flag code for country-flag-icons, e.g. SI or GB-ENG",
    )
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Countries"
        ordering = ["order", "name"]

    def __str__(self):
        return f"{self.name} ({self.code})"
