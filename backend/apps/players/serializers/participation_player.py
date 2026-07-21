from rest_framework import serializers

from apps.players.models import PlayerStatus, TeamParticipationPlayer
from apps.players.serializers.player import PlayerListSerializer, PlayerStatusSerializer


class TeamParticipationPlayerListSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)
    team_name = serializers.CharField(
        source="team_participation.team.name",
        read_only=True,
        allow_null=True,
    )
    participation_name = serializers.CharField(
        source="team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    tournament_edition_id = serializers.IntegerField(
        source="team_participation.tournament_edition_id",
        read_only=True,
    )
    tournament_edition_name = serializers.CharField(
        source="team_participation.tournament_edition.name",
        read_only=True,
        allow_null=True,
    )
    tournament_edition_year = serializers.IntegerField(
        source="team_participation.tournament_edition.year",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = TeamParticipationPlayer
        fields = [
            "id",
            "team_participation",
            "team_name",
            "participation_name",
            "tournament_edition_id",
            "tournament_edition_name",
            "tournament_edition_year",
            "player",
            "jersey_number",
            "position",
            "is_captain",
            "is_vice_captain",
            "status",
            "is_active",
            "goals",
            "assists",
            "yellow_cards",
            "red_cards",
            "matches_played",
            "minutes_played",
        ]


class TeamParticipationPlayerDetailSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)
    team_name = serializers.CharField(
        source="team_participation.team.name",
        read_only=True,
        allow_null=True,
    )
    participation_name = serializers.CharField(
        source="team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    tournament_edition_id = serializers.IntegerField(
        source="team_participation.tournament_edition_id",
        read_only=True,
    )
    tournament_edition_name = serializers.CharField(
        source="team_participation.tournament_edition.name",
        read_only=True,
        allow_null=True,
    )
    tournament_edition_year = serializers.IntegerField(
        source="team_participation.tournament_edition.year",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = TeamParticipationPlayer
        fields = [
            "id",
            "team_participation",
            "team_name",
            "participation_name",
            "tournament_edition_id",
            "tournament_edition_name",
            "tournament_edition_year",
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
    status = serializers.PrimaryKeyRelatedField(
        queryset=PlayerStatus.objects.all(),
        required=False,
        allow_null=True,
    )

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
