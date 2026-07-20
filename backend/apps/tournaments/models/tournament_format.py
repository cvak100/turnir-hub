from django.db import models


class TournamentFormat(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    # Default phases to create: [{name, phase_type, order, config}, ...]
    default_phases = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Tournament formats"

    def __str__(self):
        return self.name
