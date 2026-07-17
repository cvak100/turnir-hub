from rest_framework import serializers

from apps.players.models import Team, TeamStatus
from apps.users.serializers import PersonMinimalSerializer


class TeamStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamStatus
        fields = ["id", "name", "code", "color"]


class TeamListSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "short_name", "city", "logo", "status"]


class TeamDetailSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    contact_person = PersonMinimalSerializer(read_only=True)

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "short_name",
            "logo",
            "city",
            "founded_year",
            "shirt_top",
            "shirt_bottom",
            "social_links",
            "contact_person",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]


class TeamCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = [
            "name",
            "short_name",
            "logo",
            "city",
            "founded_year",
            "shirt_top",
            "shirt_bottom",
            "social_links",
            "contact_person",
            "notes",
            "status",
        ]
