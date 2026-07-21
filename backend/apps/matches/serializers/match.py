from rest_framework import serializers

from apps.matches.models import EventType, Match, MatchEvent, MatchStatus
from apps.players.models import Player
from apps.users.serializers import PersonMinimalSerializer


class MatchStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchStatus
        fields = ["id", "name", "code", "color"]


class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = ["id", "name", "code", "icon", "color"]


class MatchListSerializer(serializers.ModelSerializer):
    status = MatchStatusSerializer(read_only=True)
    home_team_name = serializers.CharField(
        source="home_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    away_team_name = serializers.CharField(
        source="away_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    phase_name = serializers.CharField(
        source="tournament_phase.name",
        read_only=True,
    )
    phase_type = serializers.CharField(
        source="tournament_phase.phase_type",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="tournament_phase_group.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament_phase",
            "tournament_phase_group",
            "phase_name",
            "phase_type",
            "group_name",
            "match_number",
            "match_date",
            "status",
            "home_team_participation",
            "away_team_participation",
            "home_team_name",
            "away_team_name",
            "home_score",
            "away_score",
        ]


class MatchDetailSerializer(serializers.ModelSerializer):
    status = MatchStatusSerializer(read_only=True)
    referee = PersonMinimalSerializer(read_only=True)
    home_team_name = serializers.CharField(
        source="home_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    away_team_name = serializers.CharField(
        source="away_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament_phase",
            "tournament_phase_group",
            "home_team_participation",
            "away_team_participation",
            "home_team_name",
            "away_team_name",
            "match_number",
            "match_date",
            "status",
            "home_score",
            "away_score",
            "halftime_home_score",
            "halftime_away_score",
            "extra_time_home_score",
            "extra_time_away_score",
            "home_score_penalties",
            "away_score_penalties",
            "is_extra_time",
            "is_penalties",
            "is_walkover",
            "duration_minutes",
            "attendance",
            "referee",
            "notes",
            "created_at",
            "updated_at",
        ]


class MatchCreateUpdateSerializer(serializers.ModelSerializer):
    status = serializers.PrimaryKeyRelatedField(
        queryset=MatchStatus.objects.all(),
        required=False,
    )

    class Meta:
        model = Match
        fields = [
            "tournament_phase",
            "tournament_phase_group",
            "home_team_participation",
            "away_team_participation",
            "match_number",
            "match_date",
            "status",
            "home_score",
            "away_score",
            "halftime_home_score",
            "halftime_away_score",
            "extra_time_home_score",
            "extra_time_away_score",
            "home_score_penalties",
            "away_score_penalties",
            "is_extra_time",
            "is_penalties",
            "is_walkover",
            "duration_minutes",
            "attendance",
            "referee",
            "notes",
        ]


class MatchEventListSerializer(serializers.ModelSerializer):
    event_type = EventTypeSerializer(read_only=True)
    home_team_name = serializers.CharField(
        source="match.home_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    away_team_name = serializers.CharField(
        source="match.away_team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    team_name = serializers.CharField(
        source="team_participation.participation_name",
        read_only=True,
        allow_null=True,
    )
    player_name = serializers.SerializerMethodField()
    tournament_edition_id = serializers.IntegerField(
        source="match.tournament_phase.tournament_edition_id",
        read_only=True,
    )

    class Meta:
        model = MatchEvent
        fields = [
            "id",
            "match",
            "event_type",
            "minute",
            "extra_minute",
            "half",
            "team_participation",
            "team_name",
            "home_team_name",
            "away_team_name",
            "tournament_edition_id",
            "player",
            "player_name",
            "is_temporary_player",
            "temporary_player_label",
            "is_penalty",
            "is_own_goal",
            "created_at",
        ]

    def get_player_name(self, obj: MatchEvent) -> str | None:
        if obj.is_temporary_player:
            return obj.temporary_player_label or "Neznani"
        if obj.player_id and obj.player and obj.player.person_id:
            person = obj.player.person
            name = f"{person.last_name} {person.first_name}".strip()
            return name or person.nickname or f"#{obj.player_id}"
        return None


class MatchEventDetailSerializer(serializers.ModelSerializer):
    event_type = EventTypeSerializer(read_only=True)

    class Meta:
        model = MatchEvent
        fields = [
            "id",
            "match",
            "event_type",
            "minute",
            "extra_minute",
            "half",
            "team_participation",
            "player",
            "related_player",
            "goal_type",
            "body_part",
            "is_penalty",
            "is_own_goal",
            "is_var_decision",
            "var_result",
            "description",
            "score_home_at_event",
            "score_away_at_event",
            "is_temporary_player",
            "temporary_player_label",
            "created_by",
            "created_at",
            "updated_at",
        ]


class MatchEventCreateUpdateSerializer(serializers.ModelSerializer):
    player = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(),
        required=False,
        allow_null=True,
    )
    related_player = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = MatchEvent
        fields = [
            "match",
            "event_type",
            "minute",
            "extra_minute",
            "half",
            "team_participation",
            "player",
            "related_player",
            "goal_type",
            "body_part",
            "is_penalty",
            "is_own_goal",
            "is_var_decision",
            "var_result",
            "description",
            "score_home_at_event",
            "score_away_at_event",
            "is_temporary_player",
            "temporary_player_label",
        ]
