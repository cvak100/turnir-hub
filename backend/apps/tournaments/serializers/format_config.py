from rest_framework import serializers

from apps.tournaments.models import TournamentFormatConfig


class TournamentFormatConfigSerializer(serializers.ModelSerializer):
    expected_advancing_teams = serializers.IntegerField(read_only=True)

    class Meta:
        model = TournamentFormatConfig
        fields = [
            "id",
            "tournament_edition",
            "number_of_groups",
            "teams_per_group",
            "teams_advancing_per_group",
            "best_runners_up",
            "number_of_best_runners_up",
            "ranking_criteria",
            "half_duration_minutes",
            "half_time_break_minutes",
            "buffer_between_matches_minutes",
            "has_third_place_match",
            "pairing_method",
            "knockout_home_advantage",
            "expected_advancing_teams",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tournament_edition",
            "expected_advancing_teams",
            "created_at",
            "updated_at",
        ]


class TournamentFormatConfigUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentFormatConfig
        fields = [
            "number_of_groups",
            "teams_per_group",
            "teams_advancing_per_group",
            "best_runners_up",
            "number_of_best_runners_up",
            "ranking_criteria",
            "half_duration_minutes",
            "half_time_break_minutes",
            "buffer_between_matches_minutes",
            "has_third_place_match",
            "pairing_method",
            "knockout_home_advantage",
        ]
