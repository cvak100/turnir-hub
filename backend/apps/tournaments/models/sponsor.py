from django.db import models


class Sponsor(models.Model):
    name = models.CharField(max_length=150)
    logo = models.ImageField(upload_to="sponsors/", blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
