from rest_framework import serializers

from apps.players.models import Award, PlayerAward
from apps.tournaments.models import Sponsor, TournamentFinalStanding, TournamentPrize


class SponsorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sponsor
        fields = [
            "id",
            "name",
            "logo",
            "website",
            "description",
            "is_active",
        ]


class AwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Award
        fields = [
            "id",
            "name",
            "code",
            "description",
            "order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class AwardCreateSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = Award
        fields = ["name", "code", "description", "order", "is_active"]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "order": {"required": False},
            "is_active": {"required": False},
        }

    def validate_code(self, value):
        return (value or "").strip().lower().replace(" ", "_")[:50]


class PlayerAwardSerializer(serializers.ModelSerializer):
    award = AwardSerializer(read_only=True)
    player_name = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = PlayerAward
        fields = [
            "id",
            "player",
            "player_name",
            "award",
            "tournament_edition",
            "team_participation",
            "team_name",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_player_name(self, obj):
        person = getattr(obj.player, "person", None)
        if person is None:
            return f"#{obj.player_id}"
        full = f"{person.last_name} {person.first_name}".strip()
        return full or person.nickname or f"#{obj.player_id}"

    def get_team_name(self, obj):
        part = obj.team_participation
        if part is None:
            return None
        return part.participation_name or (
            part.team.name if part.team_id else None
        )


class PlayerAwardWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerAward
        fields = [
            "player",
            "award",
            "tournament_edition",
            "team_participation",
            "notes",
        ]


class TournamentFinalStandingSerializer(serializers.ModelSerializer):
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentFinalStanding
        fields = [
            "id",
            "tournament_edition",
            "team_participation",
            "team_name",
            "position",
            "matches_played",
            "wins",
            "draws",
            "losses",
            "points",
            "goals_for",
            "goals_against",
            "goal_difference",
            "qualification",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_team_name(self, obj):
        part = obj.team_participation
        return part.participation_name or (
            part.team.name if part.team_id else f"#{part.id}"
        )


class TournamentFinalStandingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentFinalStanding
        fields = [
            "tournament_edition",
            "team_participation",
            "position",
            "matches_played",
            "wins",
            "draws",
            "losses",
            "points",
            "goals_for",
            "goals_against",
            "goal_difference",
            "qualification",
            "notes",
        ]


class TournamentPrizeSerializer(serializers.ModelSerializer):
    sponsor = SponsorSerializer(read_only=True)
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentPrize
        fields = [
            "id",
            "tournament_edition",
            "player_award",
            "team_participation",
            "team_name",
            "sponsor",
            "prize_type",
            "value",
            "description",
            "recipient_type",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_team_name(self, obj):
        part = obj.team_participation
        if part is None:
            return None
        return part.participation_name or (
            part.team.name if part.team_id else None
        )


class TournamentPrizeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPrize
        fields = [
            "tournament_edition",
            "player_award",
            "team_participation",
            "sponsor",
            "prize_type",
            "value",
            "description",
            "recipient_type",
            "notes",
        ]


class FinishStandingInputSerializer(serializers.Serializer):
    team_participation_id = serializers.IntegerField()
    position = serializers.IntegerField(min_value=1)
    matches_played = serializers.IntegerField(required=False, allow_null=True)
    wins = serializers.IntegerField(required=False, allow_null=True)
    draws = serializers.IntegerField(required=False, allow_null=True)
    losses = serializers.IntegerField(required=False, allow_null=True)
    points = serializers.IntegerField(required=False, allow_null=True)
    goals_for = serializers.IntegerField(required=False, allow_null=True)
    goals_against = serializers.IntegerField(required=False, allow_null=True)
    goal_difference = serializers.IntegerField(required=False, allow_null=True)
    qualification = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class FinishPlayerAwardInputSerializer(serializers.Serializer):
    award_id = serializers.IntegerField()
    player_id = serializers.IntegerField()
    team_participation_id = serializers.IntegerField(
        required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class FinishPrizeInputSerializer(serializers.Serializer):
    prize_type = serializers.ChoiceField(choices=TournamentPrize.PrizeType.choices)
    recipient_type = serializers.ChoiceField(
        choices=TournamentPrize.RecipientType.choices
    )
    value = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    sponsor_id = serializers.IntegerField(required=False, allow_null=True)
    player_award_id = serializers.IntegerField(required=False, allow_null=True)
    team_participation_id = serializers.IntegerField(
        required=False, allow_null=True
    )


class FinishAwardPrizeInputSerializer(serializers.Serializer):
    prize_type = serializers.ChoiceField(choices=TournamentPrize.PrizeType.choices)
    recipient_type = serializers.ChoiceField(
        choices=TournamentPrize.RecipientType.choices,
        required=False,
        default="player",
    )
    value = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    sponsor_id = serializers.IntegerField(required=False, allow_null=True)


class FinishAwardEntryInputSerializer(serializers.Serializer):
    award_id = serializers.IntegerField(required=False, allow_null=True)
    new_award_name = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    player_id = serializers.IntegerField()
    team_participation_id = serializers.IntegerField(
        required=False, allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    prize = FinishAwardPrizeInputSerializer(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("award_id") and not (attrs.get("new_award_name") or "").strip():
            raise serializers.ValidationError(
                "award_id or new_award_name is required."
            )
        return attrs


class FinishEditionInputSerializer(serializers.Serializer):
    standings = FinishStandingInputSerializer(many=True, required=False)
    award_entries = FinishAwardEntryInputSerializer(many=True, required=False)
    player_awards = FinishPlayerAwardInputSerializer(many=True, required=False)
    prizes = FinishPrizeInputSerializer(many=True, required=False)
    new_awards = AwardCreateSerializer(many=True, required=False)
