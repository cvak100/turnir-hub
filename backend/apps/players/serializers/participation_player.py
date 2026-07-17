from rest_framework import serializers

from apps.players.models import TeamParticipationPlayer
from apps.players.serializers.player import PlayerListSerializer, PlayerStatusSerializer


class TeamParticipationPlayerListSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)

    class Meta:
        model = TeamParticipationPlayer
        fields = [
            "id",
            "team_participation",
            "player",
            "jersey_number",
            "position",
            "is_captain",
            "is_vice_captain",
            "status",
            "is_active",
            "goals",
            "assists",
        ]


class TeamParticipationPlayerDetailSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)

    class Meta:
        model = TeamParticipationPlayer
        fields = [
            "id",
            "team_participation",
            "player",
            "jersey_number",
            "position",
            "is_captain",
            "is_vice_captain",
            "is_active",
            "status",
            "goals",
            "assists",
            "yellow_cards",
            "red_cards",
            "minutes_played",
            "matches_played",
            "notes",
            "created_at",
            "updated_at",
        ]


class TeamParticipationPlayerCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamParticipationPlayer
        fields = [
            "team_participation",
            "player",
            "jersey_number",
            "position",
            "is_captain",
            "is_vice_captain",
            "is_active",
            "status",
            "goals",
            "assists",
            "yellow_cards",
            "red_cards",
            "minutes_played",
            "matches_played",
            "notes",
        ]
