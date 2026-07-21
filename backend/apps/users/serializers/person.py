from rest_framework import serializers

from apps.users.models import Person


class PersonMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "nickname"]


class PersonPublicSerializer(serializers.ModelSerializer):
    """Public-facing person fields for player profiles (no email/phone/notes)."""

    nationality_name = serializers.CharField(
        source="nationality.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "nickname",
            "date_of_birth",
            "place_of_birth",
            "nationality_name",
            "gender",
            "photo",
            "bio",
            "city",
            "country",
            "show_as_anonymous",
        ]
