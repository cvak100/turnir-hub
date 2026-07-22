from rest_framework import serializers

from apps.core.validators import validate_image_file
from apps.tournaments.models import TournamentEdition, TournamentFormat, TournamentStatus
from apps.tournaments.serializers.category import TournamentCategorySerializer
from apps.tournaments.serializers.format_config import TournamentFormatConfigSerializer
from apps.tournaments.serializers.global_rule_template import (
    GlobalRuleTemplateSerializer,
)
from apps.tournaments.serializers.tournament import TournamentListSerializer
from apps.users.serializers import PersonMinimalSerializer


class TournamentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentStatus
        fields = ["id", "name", "code", "color", "order", "is_active"]


class TournamentFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentFormat
        fields = [
            "id",
            "name",
            "code",
            "description",
            "default_phases",
            "order",
            "is_active",
        ]


class TournamentEditionListSerializer(serializers.ModelSerializer):
    status = TournamentStatusSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)
    format = TournamentFormatSerializer(read_only=True)
    category = TournamentCategorySerializer(read_only=True)

    class Meta:
        model = TournamentEdition
        fields = [
            "id",
            "name",
            "year",
            "tournament",
            "tournament_name",
            "status",
            "format",
            "category",
            "start_date",
            "end_date",
            "is_public",
        ]


class TournamentEditionDetailSerializer(serializers.ModelSerializer):
    status = TournamentStatusSerializer(read_only=True)
    tournament = TournamentListSerializer(read_only=True)
    contact_person = PersonMinimalSerializer(read_only=True)
    global_rule_template = GlobalRuleTemplateSerializer(read_only=True)
    format = TournamentFormatSerializer(read_only=True)
    category = TournamentCategorySerializer(read_only=True)
    format_config = TournamentFormatConfigSerializer(read_only=True)

    class Meta:
        model = TournamentEdition
        fields = [
            "id",
            "tournament",
            "name",
            "year",
            "start_date",
            "end_date",
            "registration_start",
            "registration_end",
            "category",
            "max_teams",
            "max_players_per_team",
            "status",
            "format",
            "public_rules",
            "configuration",
            "format_config",
            "global_rule_template",
            "location",
            "cover_image",
            "contact_person",
            "entry_fee",
            "social_links",
            "is_public",
            "created_at",
            "updated_at",
        ]


class TournamentEditionCreateSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_image_file],
    )
    apply_format_phases = serializers.BooleanField(required=False, default=True)
    replace_format_phases = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = TournamentEdition
        fields = [
            "tournament",
            "name",
            "year",
            "start_date",
            "end_date",
            "registration_start",
            "registration_end",
            "category",
            "max_teams",
            "max_players_per_team",
            "status",
            "format",
            "public_rules",
            "configuration",
            "global_rule_template",
            "location",
            "cover_image",
            "contact_person",
            "entry_fee",
            "social_links",
            "is_public",
            "apply_format_phases",
            "replace_format_phases",
        ]
