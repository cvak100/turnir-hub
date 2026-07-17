from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.matches.models import Match, MatchEvent, MatchStatus
from apps.tournaments.models import TournamentPhaseGroupTeam


class MatchService:
    @staticmethod
    def _default_status():
        status = MatchStatus.objects.filter(code="scheduled").first()
        if status is None:
            status = MatchStatus.objects.first()
        return status

    @staticmethod
    def _validate_teams(*, data: dict, match: Match | None = None):
        home = data.get("home_team_participation")
        away = data.get("away_team_participation")
        phase = data.get("tournament_phase")
        group = data.get("tournament_phase_group")

        if match is not None:
            home = data.get("home_team_participation", match.home_team_participation)
            away = data.get("away_team_participation", match.away_team_participation)
            phase = data.get("tournament_phase", match.tournament_phase)
            group = data.get(
                "tournament_phase_group",
                match.tournament_phase_group,
            )

        if home and away and home.id == away.id:
            raise ValidationError("Home and away teams must be different.")

        edition_id = phase.tournament_edition_id if phase else None

        for label, participation in (("home_team_participation", home), ("away_team_participation", away)):
            if participation is None:
                continue
            if edition_id and participation.tournament_edition_id != edition_id:
                raise ValidationError(
                    {label: "Both teams must belong to the same edition."}
                )

        if group is not None:
            if phase and group.tournament_phase_id != phase.id:
                raise ValidationError(
                    {
                        "tournament_phase_group": (
                            "Group must belong to the selected phase."
                        )
                    }
                )
            for label, participation in (
                ("home_team_participation", home),
                ("away_team_participation", away),
            ):
                if participation is None:
                    continue
                in_group = TournamentPhaseGroupTeam.objects.filter(
                    tournament_phase_group=group,
                    team_participation=participation,
                ).exists()
                if not in_group:
                    raise ValidationError(
                        {
                            label: (
                                "Team must belong to the selected group for group matches."
                            )
                        }
                    )

    @staticmethod
    @transaction.atomic
    def create_match(*, data: dict) -> Match:
        MatchService._validate_teams(data=data)
        payload = dict(data)
        if not payload.get("status"):
            default_status = MatchService._default_status()
            if default_status is None:
                raise ValidationError({"status": "No MatchStatus available."})
            payload["status"] = default_status
        return Match.objects.create(**payload)

    @staticmethod
    @transaction.atomic
    def update_match(*, match: Match, data: dict) -> Match:
        MatchService._validate_teams(data=data, match=match)
        for attr, value in data.items():
            setattr(match, attr, value)
        match.save()
        return match


class MatchEventService:
    @staticmethod
    @transaction.atomic
    def create_event(*, data: dict, user=None) -> MatchEvent:
        return MatchEvent.objects.create(created_by=user, **data)

    @staticmethod
    @transaction.atomic
    def update_event(*, event: MatchEvent, data: dict) -> MatchEvent:
        for attr, value in data.items():
            setattr(event, attr, value)
        event.save()
        return event
