from rest_framework import serializers

from apps.players.models import TeamParticipation
from apps.players.serializers.team import TeamListSerializer, TeamStatusSerializer
from apps.users.serializers import PersonMinimalSerializer


class TeamParticipationListSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)
    tournament_edition_name = serializers.CharField(
        source="tournament_edition.name",
        read_only=True,
    )

    class Meta:
        model = TeamParticipation
        fields = [
            "id",
            "participation_name",
            "team",
            "team_name",
            "tournament_edition",
            "tournament_edition_name",
            "status",
            "payment_status",
            "registered_at",
        ]


class TeamParticipationDetailSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    team = TeamListSerializer(read_only=True)
    contact_person = PersonMinimalSerializer(read_only=True)

    class Meta:
        model = TeamParticipation
        fields = [
            "id",
            "team",
            "tournament_edition",
            "participation_name",
            "contact_person",
            "payment_status",
            "status",
            "registered_at",
            "notes",
            "created_at",
            "updated_at",
        ]


class TeamParticipationCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamParticipation
        fields = [
            "team",
            "tournament_edition",
            "participation_name",
            "contact_person",
            "payment_status",
            "status",
            "registered_at",
            "notes",
        ]
