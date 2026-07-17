from rest_framework import serializers

from apps.core.validators import validate_image_file
from apps.tournaments.models import TournamentEdition, TournamentStatus
from apps.tournaments.serializers.tournament import TournamentListSerializer
from apps.users.serializers import PersonMinimalSerializer


class TournamentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentStatus
        fields = ["id", "name", "code", "color"]


class TournamentEditionListSerializer(serializers.ModelSerializer):
    status = TournamentStatusSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = TournamentEdition
        fields = [
            "id",
            "name",
            "year",
            "tournament",
            "tournament_name",
            "status",
            "start_date",
            "end_date",
            "is_public",
        ]


class TournamentEditionDetailSerializer(serializers.ModelSerializer):
    status = TournamentStatusSerializer(read_only=True)
    tournament = TournamentListSerializer(read_only=True)
    contact_person = PersonMinimalSerializer(read_only=True)

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
            "public_rules",
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
            "public_rules",
            "global_rule_template",
            "location",
            "cover_image",
            "contact_person",
            "entry_fee",
            "social_links",
            "is_public",
        ]
