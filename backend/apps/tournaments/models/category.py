from django.db import models


class TournamentCategory(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "Tournament categories"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name
