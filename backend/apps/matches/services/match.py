import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import InvalidStateError
from apps.matches.models import Match, MatchEvent, MatchStatus
from apps.matches.status_codes import (
    FINISHED_MATCH_STATUS_CODES,
    LIVE_MATCH_STATUS_CODES,
    SCHEDULED_MATCH_STATUS_CODES,
    event_half_for_status,
    get_match_status,
    is_finished_match_status,
    is_live_match_status,
    is_scheduled_match_status,
)
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
        return get_match_status(code)

    @staticmethod
    def _validate_event_editable(match: Match):
        """Live-like statuses or finished (Normal Edit)."""
        code = match.status.code if match.status_id else None
        if is_live_match_status(code) or is_finished_match_status(code):
            return
        raise InvalidStateError(
            "Match must be in a live period or finished to create/edit events."
        )

    @staticmethod
    def _is_shootout_half(half: str | None) -> bool:
        return (half or "").strip().lower() == "penalties"

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
        shootout = MatchEventService._is_shootout_half(data.get("half"))

        if is_temporary:
            if not label:
                raise ValidationError(
                    {
                        "temporary_player_label": (
                            "Temporary player requires a label."
                        )
                    }
                )
        elif player is None and not shootout:
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
        # Shootout uses minute as kick sequence number — allow higher values.
        if minute is not None and not shootout and minute > 130:
            raise ValidationError({"minute": "Minute looks unrealistic."})

    @staticmethod
    def recalculate_match_score(match: Match) -> Match:
        home_id = match.home_team_participation_id
        away_id = match.away_team_participation_id
        home = 0
        away = 0
        home_ht = 0
        away_ht = 0
        home_et = 0
        away_et = 0
        home_pen = 0
        away_pen = 0

        events = match.events.select_related("event_type").all()
        for event in events:
            code = event.event_type.code
            team_id = event.team_participation_id
            half = (event.half or "").strip()
            shootout = MatchEventService._is_shootout_half(half)

            if shootout:
                if code == "penalty_scored":
                    if team_id == home_id:
                        home_pen += 1
                    elif team_id == away_id:
                        away_pen += 1
                continue

            if code == "penalty_missed":
                continue

            is_own = event.is_own_goal or code == OWN_GOAL_CODE
            is_goal = code in GOAL_EVENT_CODES or code == "goal" or is_own
            if not is_goal:
                continue

            if is_own:
                if team_id == home_id:
                    scorer_side = "away"
                elif team_id == away_id:
                    scorer_side = "home"
                else:
                    continue
            else:
                if team_id == home_id:
                    scorer_side = "home"
                elif team_id == away_id:
                    scorer_side = "away"
                else:
                    continue

            if scorer_side == "home":
                home += 1
            else:
                away += 1

            # Half "1" (and legacy empty) → halftime snapshot
            if half in ("", "1"):
                if scorer_side == "home":
                    home_ht += 1
                else:
                    away_ht += 1
            elif half.upper().startswith("ET"):
                if scorer_side == "home":
                    home_et += 1
                else:
                    away_et += 1

        match.home_score = home
        match.away_score = away
        match.halftime_home_score = home_ht
        match.halftime_away_score = away_ht
        match.extra_time_home_score = home_et
        match.extra_time_away_score = away_et
        match.home_score_penalties = home_pen
        match.away_score_penalties = away_pen
        match.save(
            update_fields=[
                "home_score",
                "away_score",
                "halftime_home_score",
                "halftime_away_score",
                "extra_time_home_score",
                "extra_time_away_score",
                "home_score_penalties",
                "away_score_penalties",
                "updated_at",
            ]
        )
        return match

    @staticmethod
    def refresh_match_from_events(*, match: Match) -> Match:
        """Recompute scores + player stats from all match events."""
        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.refresh_from_db()
        MatchEventService.broadcast_match_update(match=match, event=None)
        live_logger.info(
            "match_refreshed_from_events match_id=%s score=%s:%s ht=%s:%s",
            match.id,
            match.home_score,
            match.away_score,
            match.halftime_home_score,
            match.halftime_away_score,
        )
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
            # Penalty shootout does not count toward player tournament stats.
            if MatchEventService._is_shootout_half(event.half):
                continue
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

        finished_ids = list(
            MatchStatus.objects.filter(
                code__in=FINISHED_MATCH_STATUS_CODES
            ).values_list("id", flat=True)
        )
        matches = Match.objects.filter(tournament_phase_group=group)
        if finished_ids:
            matches = matches.filter(status_id__in=finished_ids)

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
                "home_penalties": match.home_score_penalties,
                "away_penalties": match.away_score_penalties,
            },
            "status": match.status.code if match.status_id else None,
            "is_penalties": match.is_penalties,
            "event": None,
        }
        if event is not None:
            payload["event"] = {
                "id": event.id,
                "event_type": event.event_type.code,
                "minute": event.minute,
                "extra_minute": event.extra_minute,
                "half": event.half,
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
        MatchEventService._validate_event_editable(match)
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
        MatchEventService._validate_event_editable(match)
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
            "half": data.get("half", event.half),
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
        MatchEventService._validate_event_editable(match)
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
        if is_live_match_status(code):
            raise InvalidStateError("Match is already live.")
        if code == "cancelled":
            raise InvalidStateError("Cannot start a cancelled match.")
        match.status = MatchEventService._get_status("match_first_half")
        match.is_penalties = False
        match.save(update_fields=["status", "is_penalties", "updated_at"])
        live_logger.info("match_started match_id=%s from_status=%s", match.id, code)
        MatchEventService.broadcast_match_update(match=match)
        return match

    @staticmethod
    @transaction.atomic
    def reopen_match(*, match: Match) -> Match:
        """Put a finished match back to 1st half (live)."""
        code = match.status.code if match.status_id else None
        if is_live_match_status(code):
            raise InvalidStateError("Match is already live.")
        if not is_finished_match_status(code):
            raise InvalidStateError("Only a finished match can be reopened to live.")
        match.status = MatchEventService._get_status("match_first_half")
        match.is_penalties = False
        match.save(update_fields=["status", "is_penalties", "updated_at"])
        live_logger.info("match_reopened match_id=%s", match.id)
        MatchEventService.broadcast_match_update(match=match)
        return match

    @staticmethod
    @transaction.atomic
    def set_match_status(*, match: Match, status_code: str) -> Match:
        """Set match period/status using tournament template codes."""
        new_status = MatchEventService._get_status(status_code)

        if status_code in FINISHED_MATCH_STATUS_CODES or status_code == "match_finished":
            return MatchEventService.finish_match(match=match)

        if is_live_match_status(status_code) or status_code in SCHEDULED_MATCH_STATUS_CODES:
            match.status = new_status
            match.is_penalties = status_code == "match_penalties"
            match.save(update_fields=["status", "is_penalties", "updated_at"])
            live_logger.info(
                "match_status_set match_id=%s status=%s",
                match.id,
                status_code,
            )
            MatchEventService.broadcast_match_update(match=match)
            return match

        raise InvalidStateError(f"Unsupported match status '{status_code}'.")

    @staticmethod
    @transaction.atomic
    def finish_match(*, match: Match) -> Match:
        code = match.status.code if match.status_id else None
        if is_finished_match_status(code):
            raise InvalidStateError("Match is already finished.")
        MatchEventService.recalculate_match_score(match)
        MatchEventService.recalculate_player_stats(match=match)
        match.status = MatchEventService._get_status("match_finished")
        match.is_penalties = False
        match.save(update_fields=["status", "is_penalties", "updated_at"])
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
        status = MatchStatus.objects.filter(code="match_scheduled").first()
        if status is None:
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

    ROUND_MATCH_COUNTS = {
        "round_of_128": 64,
        "round_of_64": 32,
        "round_of_32": 16,
        "round_of_16": 8,
        "quarterfinal": 4,
        "semifinal": 2,
        "final": 1,
        "third_place": 1,
        "winners": 4,
        "losers": 4,
    }

    @staticmethod
    def _expected_group_team_count(*, group, config: dict) -> int:
        assigned = group.group_teams.count()
        if assigned >= 2:
            return assigned
        raw = config.get("teams_per_group")
        if raw is None or raw == "":
            raw = group.max_teams
        try:
            return int(raw) if raw is not None else 0
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _round_robin_match_count(team_count: int) -> int:
        if team_count < 2:
            return 0
        return team_count * (team_count - 1) // 2

    @staticmethod
    def _assert_matches_empty_tbd(matches, *, label: str):
        for match in matches:
            if match.home_team_participation_id or match.away_team_participation_id:
                raise ValidationError(
                    {
                        "matches": (
                            f"{label} already has matches with teams assigned. "
                            "Remove them first or do not use replace."
                        )
                    }
                )
            if match.events.exists():
                raise ValidationError(
                    {"matches": f"{label} has matches with events."}
                )

    @staticmethod
    def _next_match_number(matches) -> int:
        nums = [m.match_number for m in matches if m.match_number is not None]
        return (max(nums) if nums else 0) + 1

    @staticmethod
    def _create_tbd_matches(
        *,
        phase,
        group,
        status,
        count: int,
        start_number: int,
    ) -> list:
        created = []
        num = start_number
        for _ in range(count):
            created.append(
                Match.objects.create(
                    tournament_phase=phase,
                    tournament_phase_group=group,
                    match_number=num,
                    status=status,
                    home_team_participation=None,
                    away_team_participation=None,
                )
            )
            num += 1
        return created

    @staticmethod
    @transaction.atomic
    def generate_placeholder_matches(*, phase, replace: bool = False, match_count=None):
        """
        Ensure expected TBD match slots exist for a phase.
        - If count already matches: leave alone
        - If fewer matches: add only the missing TBD slots (keeps filled matches)
        - If replace=True: wipe empty TBD and recreate full set
        - If more matches than expected (and not replace): error unless extras are empty TBD
        """
        status = MatchService._default_status()
        if status is None:
            raise InvalidStateError("No MatchStatus available.")

        created = []
        if phase.phase_type == "group_stage":
            groups = list(phase.groups.order_by("order", "id"))
            if not groups:
                raise ValidationError(
                    {"groups": "Generate groups before creating group matches."}
                )
            config = phase.config or {}
            for group in groups:
                n = MatchService._expected_group_team_count(group=group, config=config)
                if n < 2:
                    continue
                expected = MatchService._round_robin_match_count(n)
                existing = list(group.matches.order_by("match_number", "id"))
                existing_count = len(existing)

                if replace and existing:
                    MatchService._assert_matches_empty_tbd(
                        existing, label=f"Group '{group.name}'"
                    )
                    group.matches.all().delete()
                    existing = []
                    existing_count = 0

                if existing_count == expected:
                    continue

                if group.max_teams != n:
                    group.max_teams = n
                    group.save(update_fields=["max_teams", "updated_at"])

                if existing_count < expected:
                    missing = expected - existing_count
                    created.extend(
                        MatchService._create_tbd_matches(
                            phase=phase,
                            group=group,
                            status=status,
                            count=missing,
                            start_number=MatchService._next_match_number(existing),
                        )
                    )
                    continue

                # Too many matches: remove trailing empty TBD only
                excess = existing_count - expected
                removable = [
                    m
                    for m in reversed(existing)
                    if not m.home_team_participation_id
                    and not m.away_team_participation_id
                    and not m.events.exists()
                ]
                if len(removable) < excess:
                    raise ValidationError(
                        {
                            "matches": (
                                f"Group '{group.name}' has more matches than expected "
                                "and extras are not empty TBD."
                            )
                        }
                    )
                for match in removable[:excess]:
                    match.delete()
            return created

        # Knockout / third_place / league / other
        count = match_count
        if count is None:
            config = phase.config or {}
            code = config.get("round_code")
            if isinstance(code, str) and code in MatchService.ROUND_MATCH_COUNTS:
                count = MatchService.ROUND_MATCH_COUNTS[code]
            elif config.get("number_of_teams"):
                try:
                    teams = int(config["number_of_teams"])
                    count = max(1, teams // 2)
                except (TypeError, ValueError):
                    count = 1
            else:
                count = 1
        try:
            count = int(count)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"match_count": "Must be an integer."}) from exc
        if count < 1 or count > 128:
            raise ValidationError({"match_count": "Must be between 1 and 128."})

        existing = list(
            phase.matches.filter(tournament_phase_group__isnull=True).order_by(
                "match_number", "id"
            )
        )
        if replace and existing:
            MatchService._assert_matches_empty_tbd(existing, label="This phase")
            phase.matches.filter(tournament_phase_group__isnull=True).delete()
            existing = []

        if len(existing) == count:
            return []

        if len(existing) < count:
            missing = count - len(existing)
            created.extend(
                MatchService._create_tbd_matches(
                    phase=phase,
                    group=None,
                    status=status,
                    count=missing,
                    start_number=MatchService._next_match_number(existing),
                )
            )
            return created

        excess = len(existing) - count
        removable = [
            m
            for m in reversed(existing)
            if not m.home_team_participation_id
            and not m.away_team_participation_id
            and not m.events.exists()
        ]
        if len(removable) < excess:
            raise ValidationError(
                {
                    "matches": (
                        "Phase has more matches than expected "
                        "and extras are not empty TBD."
                    )
                }
            )
        for match in removable[:excess]:
            match.delete()
        return created
