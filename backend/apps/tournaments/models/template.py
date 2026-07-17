from django.db import models


class Template(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, unique=True)
    template_type = models.CharField(max_length=50)
    value = models.JSONField(null=True, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, blank=True)
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["template_type", "order", "name"]

    def __str__(self):
        return f"{self.template_type}: {self.name}"
