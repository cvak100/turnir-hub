from rest_framework import serializers

from apps.core.validators import validate_image_file
from apps.tournaments.models import Sport, Tournament
from apps.users.serializers import PersonMinimalSerializer


class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ["id", "name", "is_active"]


class TournamentListSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)

    class Meta:
        model = Tournament
        fields = ["id", "name", "sport", "logo", "is_active"]


class TournamentDetailSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    contact_person = PersonMinimalSerializer(read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "sport",
            "description",
            "logo",
            "contact_person",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TournamentCreateUpdateSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_image_file],
    )

    class Meta:
        model = Tournament
        fields = [
            "name",
            "sport",
            "description",
            "logo",
            "contact_person",
            "is_active",
        ]
