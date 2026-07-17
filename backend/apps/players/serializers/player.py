from rest_framework import serializers

from apps.players.models import Player, PlayerStatus
from apps.users.serializers import PersonMinimalSerializer


class PlayerStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerStatus
        fields = ["id", "name", "code", "color"]


class PlayerListSerializer(serializers.ModelSerializer):
    person = PersonMinimalSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)

    class Meta:
        model = Player
        fields = [
            "id",
            "person",
            "position",
            "preferred_jersey_number",
            "status",
            "is_active",
        ]


class PlayerDetailSerializer(serializers.ModelSerializer):
    person = PersonMinimalSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)

    class Meta:
        model = Player
        fields = [
            "id",
            "person",
            "position",
            "preferred_jersey_number",
            "height_cm",
            "weight_kg",
            "dominant_foot",
            "nationality",
            "photo",
            "biography",
            "social_links",
            "status",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]


class PlayerCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            "person",
            "position",
            "preferred_jersey_number",
            "height_cm",
            "weight_kg",
            "dominant_foot",
            "nationality",
            "photo",
            "biography",
            "social_links",
            "status",
            "notes",
            "is_active",
        ]
