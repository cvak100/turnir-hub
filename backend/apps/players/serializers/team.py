from rest_framework import serializers

from apps.core.validators import validate_image_file
from apps.players.models import Team, TeamStatus
from apps.users.serializers import PersonMinimalSerializer

SHIRT_COLOR_CODES = [
    "white",
    "black",
    "red",
    "blue",
    "navy",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
]


class TeamStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamStatus
        fields = ["id", "name", "code", "color", "order", "is_active"]


class TeamListSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    players_count = serializers.SerializerMethodField()
    appearances_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "short_name",
            "city",
            "logo",
            "status",
            "players_count",
            "appearances_count",
        ]

    def get_players_count(self, obj) -> int:
        return int(getattr(obj, "players_count", 0) or 0)

    def get_appearances_count(self, obj) -> int:
        return int(getattr(obj, "appearances_count", 0) or 0)


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
    logo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_image_file],
    )
    status = serializers.PrimaryKeyRelatedField(
        queryset=TeamStatus.objects.all(),
        required=False,
        allow_null=True,
    )
    shirt_top = serializers.ChoiceField(
        choices=[(c, c) for c in SHIRT_COLOR_CODES],
        required=False,
        allow_blank=True,
    )
    shirt_bottom = serializers.ChoiceField(
        choices=[(c, c) for c in SHIRT_COLOR_CODES],
        required=False,
        allow_blank=True,
    )

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
