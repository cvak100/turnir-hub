from rest_framework import serializers

from apps.core.validators import validate_image_file
from apps.players.models import Player, PlayerAward, PlayerStatus
from apps.tournaments.models import TournamentFinalStanding, TournamentPrize
from apps.users.serializers import PersonMinimalSerializer, PersonPublicSerializer


class PlayerStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerStatus
        fields = ["id", "name", "code", "color"]


class PlayerAwardProfileSerializer(serializers.ModelSerializer):
    award_name = serializers.CharField(source="award.name", read_only=True)
    award_code = serializers.CharField(source="award.code", read_only=True)
    edition_id = serializers.IntegerField(
        source="tournament_edition_id", read_only=True
    )
    edition_name = serializers.CharField(
        source="tournament_edition.name", read_only=True
    )
    edition_year = serializers.IntegerField(
        source="tournament_edition.year", read_only=True
    )
    team_name = serializers.SerializerMethodField()
    prizes = serializers.SerializerMethodField()

    class Meta:
        model = PlayerAward
        fields = [
            "id",
            "award_name",
            "award_code",
            "edition_id",
            "edition_name",
            "edition_year",
            "team_name",
            "notes",
            "prizes",
        ]

    def get_team_name(self, obj):
        part = obj.team_participation
        if part is None:
            return None
        return part.participation_name or (
            part.team.name if part.team_id else None
        )

    def get_prizes(self, obj):
        rows = []
        for prize in obj.prizes.all():
            rows.append(
                {
                    "id": prize.id,
                    "prize_type": prize.prize_type,
                    "value": prize.value,
                    "description": prize.description,
                    "sponsor_name": prize.sponsor.name if prize.sponsor_id else None,
                }
            )
        return rows


class PlayerTeamAwardProfileSerializer(serializers.Serializer):
    """Team prize or final placement tied to a participation the player was on."""

    id = serializers.IntegerField()
    kind = serializers.CharField()
    title = serializers.CharField()
    edition_id = serializers.IntegerField(allow_null=True)
    edition_name = serializers.CharField(allow_null=True)
    edition_year = serializers.IntegerField(allow_null=True)
    team_name = serializers.CharField(allow_null=True)
    prize_type = serializers.CharField(allow_null=True, required=False)
    value = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True, required=False
    )
    description = serializers.CharField(allow_blank=True, required=False)
    position = serializers.IntegerField(allow_null=True, required=False)
    qualification = serializers.CharField(allow_blank=True, required=False)


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
    person = PersonPublicSerializer(read_only=True)
    status = PlayerStatusSerializer(read_only=True)
    awards = serializers.SerializerMethodField()
    team_awards = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = [
            "id",
            "person",
            "position",
            "secondary_position",
            "preferred_jersey_number",
            "height_cm",
            "weight_kg",
            "dominant_foot",
            "current_club",
            "contract_until",
            "nationality",
            "photo",
            "biography",
            "social_links",
            "status",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
            "awards",
            "team_awards",
        ]

    def get_awards(self, obj):
        qs = obj.awards.select_related(
            "award",
            "tournament_edition",
            "team_participation",
            "team_participation__team",
        ).prefetch_related("prizes__sponsor").order_by(
            "-tournament_edition__year",
            "award__order",
            "id",
        )
        return PlayerAwardProfileSerializer(qs, many=True).data

    def get_team_awards(self, obj):
        part_ids = list(
            obj.participations.values_list("team_participation_id", flat=True)
        )
        if not part_ids:
            return []

        rows: list[dict] = []

        prizes = (
            TournamentPrize.objects.filter(
                team_participation_id__in=part_ids,
                recipient_type=TournamentPrize.RecipientType.TEAM,
            )
            .select_related(
                "tournament_edition",
                "team_participation",
                "team_participation__team",
                "sponsor",
            )
            .order_by("-tournament_edition__year", "id")
        )
        for prize in prizes:
            part = prize.team_participation
            team_name = None
            if part is not None:
                team_name = part.participation_name or (
                    part.team.name if part.team_id else None
                )
            title = prize.description.strip() or prize.get_prize_type_display()
            if prize.sponsor_id:
                title = f"{title} ({prize.sponsor.name})"
            rows.append(
                {
                    "id": prize.id,
                    "kind": "prize",
                    "title": title,
                    "edition_id": prize.tournament_edition_id,
                    "edition_name": prize.tournament_edition.name
                    if prize.tournament_edition_id
                    else None,
                    "edition_year": prize.tournament_edition.year
                    if prize.tournament_edition_id
                    else None,
                    "team_name": team_name,
                    "prize_type": prize.prize_type,
                    "value": prize.value,
                    "description": prize.description,
                    "position": None,
                    "qualification": "",
                }
            )

        standings = (
            TournamentFinalStanding.objects.filter(
                team_participation_id__in=part_ids
            )
            .select_related(
                "tournament_edition",
                "team_participation",
                "team_participation__team",
            )
            .order_by("-tournament_edition__year", "position", "id")
        )
        for standing in standings:
            part = standing.team_participation
            team_name = part.participation_name or (
                part.team.name if part.team_id else None
            )
            qual = (standing.qualification or "").strip()
            title = qual or f"{standing.position}. mesto"
            rows.append(
                {
                    "id": standing.id,
                    "kind": "standing",
                    "title": title,
                    "edition_id": standing.tournament_edition_id,
                    "edition_name": standing.tournament_edition.name
                    if standing.tournament_edition_id
                    else None,
                    "edition_year": standing.tournament_edition.year
                    if standing.tournament_edition_id
                    else None,
                    "team_name": team_name,
                    "prize_type": None,
                    "value": None,
                    "description": standing.notes or "",
                    "position": standing.position,
                    "qualification": standing.qualification or "",
                }
            )

        return PlayerTeamAwardProfileSerializer(rows, many=True).data


class PlayerCreateUpdateSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[validate_image_file],
    )

    class Meta:
        model = Player
        fields = [
            "person",
            "position",
            "secondary_position",
            "preferred_jersey_number",
            "height_cm",
            "weight_kg",
            "dominant_foot",
            "current_club",
            "contract_until",
            "nationality",
            "photo",
            "biography",
            "social_links",
            "status",
            "notes",
            "is_active",
        ]
