from rest_framework import serializers

from apps.tournaments.models import Sport, Tournament
from apps.users.serializers import PersonMinimalSerializer


class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ["id", "name"]


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
