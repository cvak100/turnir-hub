from django.conf import settings
from django.db import models

from .person_status import PersonStatus


class Person(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        UNSPECIFIED = "", "Unspecified"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="person",
        help_text="Optional login account linked to this person.",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    nickname = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    place_of_birth = models.CharField(max_length=150, blank=True)
    nationality = models.ForeignKey(
        "users.Country",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="persons",
    )
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True,
        default="",
    )
    photo = models.ImageField(upload_to="persons/photos/", blank=True)
    bio = models.TextField(blank=True)
    status = models.ForeignKey(
        PersonStatus,
        on_delete=models.PROTECT,
        related_name="persons",
    )

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    show_as_anonymous = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def has_role(self, code: str) -> bool:
        return self.person_roles.filter(role_type__code=code).exists()
