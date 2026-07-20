from rest_framework import serializers

from apps.tournaments.models import GlobalRuleTemplate


class GlobalRuleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalRuleTemplate
        fields = [
            "id",
            "name",
            "description",
            "match_duration_minutes",
            "half_time_duration_minutes",
            "number_of_halves",
            "players_per_team",
            "max_players_on_roster",
            "unlimited_substitutions",
            "max_substitutions",
            "field_type",
            "ball_size",
            "allow_extra_time",
            "extra_time_minutes",
            "allow_penalties",
            "offside_rule",
            "max_team_fouls",
            "yellow_card_rules",
            "red_card_rules",
            "points_for_win",
            "points_for_draw",
            "full_rules_text",
            "notes",
            "is_system",
        ]
        read_only_fields = ["is_system"]


class GlobalRuleTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalRuleTemplate
        fields = [
            "name",
            "description",
            "match_duration_minutes",
            "half_time_duration_minutes",
            "number_of_halves",
            "players_per_team",
            "max_players_on_roster",
            "unlimited_substitutions",
            "max_substitutions",
            "field_type",
            "ball_size",
            "allow_extra_time",
            "extra_time_minutes",
            "allow_penalties",
            "offside_rule",
            "max_team_fouls",
            "yellow_card_rules",
            "red_card_rules",
            "points_for_win",
            "points_for_draw",
            "full_rules_text",
            "notes",
        ]

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Name is required.")
        if GlobalRuleTemplate.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError(
                "A rule template with this name already exists.",
            )
        return name
