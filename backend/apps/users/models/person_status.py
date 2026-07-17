from django.db import models


class PersonStatus(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Person statuses"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name
