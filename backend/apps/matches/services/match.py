import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import InvalidStateError
from apps.matches.models import Match, MatchEvent, MatchStatus
from apps.players.models import TeamParticipationPlayer
from apps.tournaments.models import TournamentPhaseGroupTeam

live_logger = logging.getLogger("turnir.matches.live")

GOAL_EVENT_CODES = {"goal", "penalty_scored"}
OWN_GOAL_CODE = "own_goal"
ASSIST_CODE = "assist"
YELLOW_CODE = "yellow_card"
RED_CODES = {"red_card", "second_yellow"}


class MatchEventService:
    @staticmethod
    def _get_status(code: str) -> MatchStatus:
        status = MatchStatus.objects.filter(code=code).first()
        if status is None:
            raise InvalidStateError(f"MatchStatus '{code}' is not configured.")
        return status

    @staticmethod
    def _validate_live_editable(match: Match, *, require_live: bool = True):
        code = match.status.code if match.status_id else None
        if require_live and code != "live":
            raise InvalidStateError("Match must be live for event entry.")
        if code == "finished":
            raise InvalidStateError(
                "Cannot modify events on a finished match without unlock."
            )

    @staticmethod
    def _validate_event_payload(*, match: Match, data: dict):
        team = data.get("team_participation")
        home_id = match.home_team_participation_id
        away_id = match.away_team_participation_id
        if team and team.id not in {home_id, away_id}:
            raise ValidationError(
                {"team_participation": "Event team must be one of the match teams."}
            )

        is_temporary = bool(data.get("is_temporary_player", False))
        label = (data.get("temporary_player_label") or "").strip()
        player = data.get("player")

        if is_temporary:
            if not label:
                raise ValidationError(
                    {
                        "temporary_player_label": (
                            "Temporary player requires a label."
                        )
                    }
                )
        elif player is None:
            raise ValidationError(
                {"player": "Player is required unless temporary player mode is used."}
            )

        if player is not None and team is not None:
            belongs = TeamParticipationPlayer.objects.filter(
                team_participation=team,
                player=player,
            ).exists()
            if not belongs:
                raise ValidationError(
                    {"player": "Player must belong to that team participation."}
                )

        minute = data.get("minute")
        if minute is not None and minute > 130:
            raise ValidationError({"minute": "Minute looks unrealistic."})

    @staticmethod
    def recalculate_match_score(match: Match) -> Match:
        home_id = match.home_team_participation_id
        away_id = match.away_team_participation_id
        home = 0
        away = 0

        events = match.events.select_related("event_type").all()
        for event in events:
            code = event.event_type.code
            if code == "penalty_missed":
                continue

            is_own = event.is_own_goal or code == OWN_GOAL_CODE
            is_goal = code in GOAL_EVENT_CODES or code == "goal" or is_own
            if not is_goal:
                continue

            team_id = event.team_participation_id
            if is_own:
                if team_id == home_id:
                    away += 1
                elif team_id == away_id:
                    home += 1
            else:
                if team_id == home_id:
                    home += 1
                elif team_id == away_id:
                    away += 1

        match.home_score = home
        match.away_score = away
        match.save(update_fields=["home_score", "away_score", "updated_at"])
        return match

    @staticmethod
    def recalculate_player_stats(*, match: Match):
        participation_ids = [
            pid
            for pid in (
                match.home_team_participation_id,
                match.away_team_participation_id,
            )
            if pid
        ]
        roster = TeamParticipationPlayer.objects.filter(
            team_participation_id__in=participation_ids,
        )
        roster.update(goals=0, assists=0, yellow_cards=0, red_cards=0)

        roster_map = {
            (row.team_participation_id, row.player_id): row
            for row in TeamParticipationPlayer.objects.filter(
                team_participation_id__in=participation_ids,
            )
        }

        events = match.events.select_related("event_type").filter(player__isnull=False)
        for event in events:
            key = (event.team_participation_id, event.player_id)
            row = roster_map.get(key)
            if row is None:
                continue
            code = event.event_type.code
            if code in GOAL_EVENT_CODES or code == "goal":
                if not event.is_own_goal and code != OWN_GOAL_CODE:
                    row.goals += 1
            if code == ASSIST_CODE:
                row.assists += 1
            if event.related_player_id and code in GOAL_EVENT_CODES | {"goal"}:
                related_key = (event.team_participation_id, event.related_player_id)
                related = roster_map.get(related_key)
                if related is not None:
                    related.assists += 1
            if code == YELLOW_CODE:
                row.yellow_cards += 1
            if code in RED_CODES:
                row.red_cards += 1

        TeamParticipationPlayer.objects.bulk_update(
            roster_map.values(),
            ["goals", "assists", "yellow_cards", "red_cards"],
        )

    @staticmethod
    def recalculate_group_standings(*, match: Match):
        group = match.tournament_phase_group
        if group is None:
            return

        group_teams = {
            gt.team_participation_id: gt
            for gt in TournamentPhaseGroupTeam.objects.filter(
                tournament_phase_group=group,
            )
        }
        for gt in group_teams.values():
            gt.played = 0
            gt.wins = 0
            gt.draws = 0
            gt.losses = 0
            gt.points = 0
            gt.goals_for = 0
            gt.goals_against = 0

        finished = MatchStatus.objects.filter(code="finished").first()
        matches = Match.objects.filter(tournament_phase_group=group)
        if finished:
            matches = matches.filter(status=finished)

        for m in matches:
            if (
                m.home_team_participation_id is None
                or m.away_team_participation_id is None
                or m.home_score is None
                or m.away_score is None
            ):
                continue
            home = group_teams.get(m.home_team_participation_id)
            away = group_teams.get(m.away_team_participation_id)
            if home is None or away is None:
                continue

            home.played += 1
            away.played += 1
            home.goals_for += m.home_score
            home.goals_against += m.away_score
            away.goals_for += m.away_score
            away.goals_against += m.home_score

            if m.home_score > m.away_score:
                home.wins += 1
                away.losses += 1
                home.points += 3
            elif m.home_score < m.away_score:
                away.wins += 1
                home.losses += 1
                away.points += 3
            else:
                home.draws += 1
                away.draws += 1
                home.points += 1
                away.points += 1

        TournamentPhaseGroupTeam.objects.bulk_update(
            group_teams.values(),
            [
                "played",
                "wins",
                "draws",
                "losses",
                "points",
                "goals_for",
                "goals_against",
            ],
        )

    @staticmethod
    def broadcast_match_update(*, match: Match, event: MatchEvent | None = None):
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = {
            "type": "match.update",
            "match_id": match.id,
            "score": {
                "home": match.home_score,
                "away": match.away_score,
            },
            "status": match.status.code if match.status_id else None,
            "event": None,
        }
        if event is not None:
            payload["event"] = {
                "id": event.id,
                "event_type": event.event_type.code,
                "minute": event.minute,
                "extra_minute": event.extra_minute,
                "team_participation_id": event.team_participation_id,
                "player_id": event.player_id,
                "is_temporary_player": event.is_temporary_player,
                "temporary_player_label": event.temporary_player_label,
                "related_player_id": event.related_player_id,
            }

        async_to_sync(channel_layer.group_send)(
            f"match.{match.id}",
            {"type": "match_update", "payload": payload},
        )

    @staticmethod
    @transaction.atomic
    def create_event(*, data: dict, user=None) -> MatchEvent:
        match = data["match"]
        MatchEventService._validate_live_editable(match, require_live=True)
        MatchEventService._validate_event_payload(match=match, data=data)

        event = MatchEvent.objects.create(created_by=user, **data)
        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.refresh_from_db()
        live_logger.info(
            "match_event_created request_user=%s match_id=%s event_id=%s event_type=%s minute=%s temporary=%s",
            getattr(user, "id", None),
            match.id,
            event.id,
            event.event_type.code,
            event.minute,
            event.is_temporary_player,
        )
        MatchEventService.broadcast_match_update(match=match, event=event)
        return event

    @staticmethod
    @transaction.atomic
    def update_event(*, event: MatchEvent, data: dict) -> MatchEvent:
        match = event.match
        MatchEventService._validate_live_editable(match, require_live=True)
        old_player_id = event.player_id
        merged = {
            "team_participation": data.get(
                "team_participation",
                event.team_participation,
            ),
            "player": data.get("player", event.player),
            "is_temporary_player": data.get(
                "is_temporary_player",
                event.is_temporary_player,
            ),
            "temporary_player_label": data.get(
                "temporary_player_label",
                event.temporary_player_label,
            ),
            "minute": data.get("minute", event.minute),
        }
        MatchEventService._validate_event_payload(match=match, data=merged)

        for attr, value in data.items():
            setattr(event, attr, value)
        event.save()

        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.refresh_from_db()
        live_logger.info(
            "match_event_updated match_id=%s event_id=%s old_player_id=%s new_player_id=%s temporary=%s",
            match.id,
            event.id,
            old_player_id,
            event.player_id,
            event.is_temporary_player,
        )
        MatchEventService.broadcast_match_update(match=match, event=event)
        return event

    @staticmethod
    @transaction.atomic
    def delete_event(*, event: MatchEvent):
        match = event.match
        MatchEventService._validate_live_editable(match, require_live=True)
        event_id = event.id
        event.delete()
        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.refresh_from_db()
        live_logger.info(
            "match_event_deleted match_id=%s event_id=%s",
            match.id,
            event_id,
        )
        MatchEventService.broadcast_match_update(match=match, event=None)

    @staticmethod
    @transaction.atomic
    def start_match(*, match: Match) -> Match:
        code = match.status.code if match.status_id else None
        if code == "finished":
            raise InvalidStateError("Cannot start a finished match.")
        if code == "live":
            raise InvalidStateError("Match is already live.")
        match.status = MatchEventService._get_status("live")
        match.save(update_fields=["status", "updated_at"])
        live_logger.info("match_started match_id=%s", match.id)
        MatchEventService.broadcast_match_update(match=match)
        return match

    @staticmethod
    @transaction.atomic
    def finish_match(*, match: Match) -> Match:
        code = match.status.code if match.status_id else None
        if code == "finished":
            raise InvalidStateError("Match is already finished.")
        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.status = MatchEventService._get_status("finished")
        match.save(update_fields=["status", "updated_at"])
        MatchEventService.recalculate_group_standings(match=match)
        live_logger.info(
            "match_finished match_id=%s score=%s:%s",
            match.id,
            match.home_score,
            match.away_score,
        )
        MatchEventService.broadcast_match_update(match=match)
        return match


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

        for label, participation in (
            ("home_team_participation", home),
            ("away_team_participation", away),
        ):
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
                raise InvalidStateError("No MatchStatus available.")
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
