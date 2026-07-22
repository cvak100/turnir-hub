from rest_framework import serializers

from apps.tournaments.models import (
    TournamentPhase,
    TournamentPhaseGroup,
    TournamentPhaseGroupTeam,
)


class TournamentPhaseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhase
        fields = [
            "id",
            "tournament_edition",
            "name",
            "phase_type",
            "order",
            "status",
            "is_active",
            "config",
        ]


class TournamentPhaseDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhase
        fields = [
            "id",
            "tournament_edition",
            "name",
            "phase_type",
            "order",
            "status",
            "is_active",
            "config",
            "created_at",
            "updated_at",
        ]


class TournamentPhaseCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhase
        fields = [
            "tournament_edition",
            "name",
            "phase_type",
            "order",
            "status",
            "is_active",
            "config",
        ]


class TournamentPhaseGroupListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhaseGroup
        fields = [
            "id",
            "tournament_phase",
            "name",
            "order",
            "max_teams",
        ]


class TournamentPhaseGroupDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhaseGroup
        fields = [
            "id",
            "tournament_phase",
            "name",
            "order",
            "max_teams",
            "created_at",
            "updated_at",
        ]


class TournamentPhaseGroupCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhaseGroup
        fields = [
            "tournament_phase",
            "name",
            "order",
            "max_teams",
        ]


class TournamentPhaseGroupTeamListSerializer(serializers.ModelSerializer):
    participation_name = serializers.CharField(
        source="team_participation.participation_name",
        read_only=True,
    )
    group_name = serializers.CharField(
        source="tournament_phase_group.name",
        read_only=True,
    )
    phase_name = serializers.CharField(
        source="tournament_phase_group.tournament_phase.name",
        read_only=True,
    )
    phase_type = serializers.CharField(
        source="tournament_phase_group.tournament_phase.phase_type",
        read_only=True,
    )

    class Meta:
        model = TournamentPhaseGroupTeam
        fields = [
            "id",
            "tournament_phase_group",
            "team_participation",
            "participation_name",
            "group_name",
            "phase_name",
            "phase_type",
            "order",
            "played",
            "wins",
            "draws",
            "losses",
            "points",
            "goals_for",
            "goals_against",
        ]


class TournamentPhaseGroupTeamDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhaseGroupTeam
        fields = [
            "id",
            "tournament_phase_group",
            "team_participation",
            "order",
            "played",
            "wins",
            "draws",
            "losses",
            "points",
            "goals_for",
            "goals_against",
            "created_at",
            "updated_at",
        ]


class TournamentPhaseGroupTeamCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentPhaseGroupTeam
        fields = [
            "tournament_phase_group",
            "team_participation",
            "order",
            "played",
            "wins",
            "draws",
            "losses",
            "points",
            "goals_for",
            "goals_against",
        ]
