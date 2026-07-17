from django.db import models

from .person import Person
from .person_role_type import PersonRoleType


class PersonRole(models.Model):
    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="person_roles",
    )
    role_type = models.ForeignKey(
        PersonRoleType,
        on_delete=models.PROTECT,
        related_name="person_roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("person", "role_type")
        ordering = ["role_type__order", "role_type__name"]

    def __str__(self):
        return f"{self.person} — {self.role_type}"
