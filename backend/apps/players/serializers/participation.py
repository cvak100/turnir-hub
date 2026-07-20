from rest_framework import serializers

from apps.players.models import TeamParticipation, TeamStatus
from apps.players.serializers.team import TeamListSerializer, TeamStatusSerializer
from apps.users.serializers import PersonMinimalSerializer


class TournamentEditionMinimalSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    year = serializers.IntegerField()


class TeamParticipationListSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    team = TeamListSerializer(read_only=True)
    tournament_edition = TournamentEditionMinimalSerializer(read_only=True)

    class Meta:
        model = TeamParticipation
        fields = [
            "id",
            "participation_name",
            "team",
            "tournament_edition",
            "status",
            "payment_status",
            "registered_at",
        ]


class TeamParticipationDetailSerializer(serializers.ModelSerializer):
    status = TeamStatusSerializer(read_only=True)
    team = TeamListSerializer(read_only=True)
    tournament_edition = TournamentEditionMinimalSerializer(read_only=True)
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
    participation_name = serializers.CharField(required=False, allow_blank=True)
    status = serializers.PrimaryKeyRelatedField(
        queryset=TeamStatus.objects.all(),
        required=False,
    )
    registered_at = serializers.DateTimeField(required=False)

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
