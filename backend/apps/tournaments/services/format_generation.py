from __future__ import annotations

import math
from typing import Any

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.core.exceptions import ConflictError, InvalidStateError
from apps.matches.models import Match, MatchStatus
from apps.tournaments.models import (
    TournamentFormatConfig,
    TournamentPhase,
    TournamentPhaseGroupTeam,
)
from apps.tournaments.services.group import TournamentPhaseGroupService


DEFAULT_RANKING = [
    "points",
    "goal_difference",
    "goals_for",
    "head_to_head",
]

# (round_code, name, phase_type, match_count) for a bracket of size N
KNOCKOUT_ROUND_BY_TEAMS = {
    128: ("round_of_128", "1/64 finale", "knockout", 64),
    64: ("round_of_64", "1/32 finale", "knockout", 32),
    32: ("round_of_32", "1/16 finale", "knockout", 16),
    16: ("round_of_16", "Osmina finala", "knockout", 8),
    8: ("quarterfinal", "Četrtfinale", "knockout", 4),
    4: ("semifinal", "Polfinale", "knockout", 2),
    2: ("final", "Finale", "knockout", 1),
}


def _is_power_of_two(n: int) -> bool:
    return n >= 2 and (n & (n - 1)) == 0


def _nearest_bracket_size(n: int) -> int:
    """Round up to next power of 2 (min 2)."""
    if n < 2:
        return 2
    return 1 << math.ceil(math.log2(n))


def knockout_round_plan(
    *,
    advancing_teams: int,
    has_third_place: bool,
) -> list[dict[str, Any]]:
    """
    Build ordered knockout rounds as sibling phases.
    Uses bracket size = next power of 2 of advancing_teams.
    """
    if advancing_teams < 2:
        return []

    size = (
        advancing_teams
        if _is_power_of_two(advancing_teams)
        else _nearest_bracket_size(advancing_teams)
    )
    plan: list[dict[str, Any]] = []
    current = size
    while current >= 2:
        meta = KNOCKOUT_ROUND_BY_TEAMS.get(current)
        if meta is None:
            # Generic round
            match_count = current // 2
            plan.append(
                {
                    "round_code": f"round_of_{current}",
                    "name": f"Runda {current}",
                    "phase_type": "knockout",
                    "match_count": match_count,
                    "number_of_teams": current,
                }
            )
        else:
            code, name, ptype, match_count = meta
            plan.append(
                {
                    "round_code": code,
                    "name": name,
                    "phase_type": ptype,
                    "match_count": match_count,
                    "number_of_teams": current,
                }
            )
        current //= 2

    if has_third_place and any(r["round_code"] == "semifinal" for r in plan):
        # Insert third place before final
        final_idx = next(
            (i for i, r in enumerate(plan) if r["round_code"] == "final"),
            len(plan),
        )
        plan.insert(
            final_idx,
            {
                "round_code": "third_place",
                "name": "Za 3. mesto",
                "phase_type": "third_place",
                "match_count": 1,
                "number_of_teams": 2,
            },
        )
    return plan


class TournamentFormatConfigService:
    @staticmethod
    def default_ranking_criteria() -> list[str]:
        return list(DEFAULT_RANKING)

    @staticmethod
    def get_or_create_for_edition(*, edition) -> TournamentFormatConfig:
        cfg, created = TournamentFormatConfig.objects.get_or_create(
            tournament_edition=edition,
            defaults={
                "ranking_criteria": TournamentFormatConfigService.default_ranking_criteria(),
            },
        )
        if created:
            TournamentFormatConfigService._hydrate_from_legacy(edition=edition, cfg=cfg)
        return cfg

    @staticmethod
    def _hydrate_from_legacy(*, edition, cfg: TournamentFormatConfig) -> None:
        """Copy useful values from edition.configuration.group_stage if present."""
        raw = edition.configuration if isinstance(edition.configuration, dict) else {}
        gs = raw.get("group_stage") if isinstance(raw.get("group_stage"), dict) else {}
        changed = False
        mapping = (
            ("number_of_groups", "number_of_groups"),
            ("teams_per_group", "teams_per_group"),
            ("teams_advancing_per_group", "teams_advancing_per_group"),
        )
        for src, dst in mapping:
            val = gs.get(src)
            if isinstance(val, int) and val > 0:
                setattr(cfg, dst, val)
                changed = True
        criteria = gs.get("ranking_criteria")
        if isinstance(criteria, list) and criteria:
            cfg.ranking_criteria = criteria
            changed = True
        # Seed timing from rule template when available
        tpl = edition.global_rule_template
        if tpl is not None:
            if tpl.match_duration_minutes and not cfg.half_duration_minutes:
                # Heuristic: full match duration / halves
                halves = tpl.number_of_halves or 2
                cfg.half_duration_minutes = max(1, int(tpl.match_duration_minutes) // halves)
                changed = True
            if tpl.half_time_duration_minutes and not cfg.half_time_break_minutes:
                cfg.half_time_break_minutes = tpl.half_time_duration_minutes
                changed = True
        if changed:
            cfg.save()

    @staticmethod
    def validate_config(cfg: TournamentFormatConfig) -> None:
        if cfg.number_of_groups < 1:
            raise ValidationError({"number_of_groups": "Must be at least 1."})
        if cfg.teams_per_group < 2:
            raise ValidationError({"teams_per_group": "Must be at least 2."})
        if cfg.teams_advancing_per_group > cfg.teams_per_group:
            raise ValidationError(
                {
                    "teams_advancing_per_group": (
                        "Cannot advance more teams than fit in a group."
                    )
                }
            )
        if cfg.best_runners_up and not cfg.number_of_best_runners_up:
            raise ValidationError(
                {
                    "number_of_best_runners_up": (
                        "Required when best_runners_up is enabled."
                    )
                }
            )

    @staticmethod
    @transaction.atomic
    def update_config(*, edition, data: dict) -> TournamentFormatConfig:
        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        for attr, value in data.items():
            setattr(cfg, attr, value)
        if not cfg.ranking_criteria:
            cfg.ranking_criteria = TournamentFormatConfigService.default_ranking_criteria()
        TournamentFormatConfigService.validate_config(cfg)
        cfg.save()
        return cfg

    @staticmethod
    def _edition_has_played_matches(edition) -> bool:
        return Match.objects.filter(
            tournament_phase__tournament_edition=edition,
            status__code="finished",
        ).exists()

    @staticmethod
    def _format_code(edition) -> str:
        if edition.format_id and edition.format:
            return edition.format.code or ""
        return "custom"

    @staticmethod
    @transaction.atomic
    def generate_structure(*, edition, replace: bool = False) -> list[TournamentPhase]:
        """
        Create phase skeleton from edition.format + format_config.
        - groups_only / group_knockout: group_stage (+ knockout rounds for latter)
        - knockout: knockout rounds from max_teams or advancing estimate
        - league: single league phase
        - custom: no auto phases
        """
        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        TournamentFormatConfigService.validate_config(cfg)

        if TournamentFormatConfigService._edition_has_played_matches(edition):
            raise ConflictError(
                "Cannot regenerate structure after matches have been finished."
            )

        code = TournamentFormatConfigService._format_code(edition)
        if not code:
            raise ValidationError(
                {"format": "Select a tournament format on the edition first."}
            )
        if code == "custom":
            raise ValidationError(
                {"format": "Custom format does not auto-generate phases."}
            )

        existing = list(edition.phases.order_by("order"))
        if existing and not replace:
            raise ConflictError(
                "Edition already has phases. Pass replace=true to rebuild."
            )

        if existing and replace:
            for phase in existing:
                # Allow wipe only if no events
                if phase.matches.filter(events__isnull=False).distinct().exists():
                    raise InvalidStateError(
                        f"Phase '{phase.name}' has matches with events."
                    )
            for phase in existing:
                phase.matches.all().delete()
                for group in phase.groups.all():
                    group.group_teams.all().delete()
                phase.groups.all().delete()
            edition.phases.all().delete()

        created: list[TournamentPhase] = []
        order = 1

        needs_groups = code in ("group_knockout", "groups_only")
        needs_knockout = code in ("group_knockout", "knockout")
        needs_league = code == "league"

        if needs_groups:
            group_config = {
                "number_of_groups": cfg.number_of_groups,
                "teams_per_group": cfg.teams_per_group,
                "teams_advancing_per_group": cfg.teams_advancing_per_group,
                "advancement": {
                    "mode": "per_group",
                    "teams_per_group": cfg.teams_advancing_per_group,
                },
                "ranking_criteria": cfg.ranking_criteria
                or TournamentFormatConfigService.default_ranking_criteria(),
                "best_runners_up": cfg.best_runners_up,
                "number_of_best_runners_up": cfg.number_of_best_runners_up,
            }
            phase = TournamentPhase.objects.create(
                tournament_edition=edition,
                name="Skupinski del",
                phase_type="group_stage",
                order=order,
                status="not_started",
                is_active=True,
                config=group_config,
            )
            order += 1
            created.append(phase)
            TournamentPhaseGroupService.generate_groups(
                phase=phase,
                number_of_groups=cfg.number_of_groups,
                max_teams=cfg.teams_per_group,
                replace=True,
            )

        if needs_league:
            phase = TournamentPhase.objects.create(
                tournament_edition=edition,
                name="Liga",
                phase_type="league",
                order=order,
                status="not_started",
                is_active=True,
                config={
                    "home_and_away": False,
                    "ranking_criteria": cfg.ranking_criteria
                    or TournamentFormatConfigService.default_ranking_criteria(),
                },
            )
            order += 1
            created.append(phase)

        if needs_knockout:
            if code == "group_knockout":
                advancing = cfg.expected_advancing_teams
            else:
                # knockout_only: use max_teams or number_of_groups*teams as hint
                advancing = edition.max_teams or cfg.expected_advancing_teams or 8
                if advancing < 2:
                    advancing = 8

            plan = knockout_round_plan(
                advancing_teams=advancing,
                has_third_place=cfg.has_third_place_match,
            )
            for row in plan:
                phase = TournamentPhase.objects.create(
                    tournament_edition=edition,
                    name=row["name"],
                    phase_type=row["phase_type"],
                    order=order,
                    status="not_started",
                    is_active=True,
                    config={
                        "round_code": row["round_code"],
                        "number_of_teams": row["number_of_teams"],
                        "match_count": row["match_count"],
                        "knockout_zone": True,
                        "pairing_method": cfg.pairing_method,
                    },
                )
                order += 1
                created.append(phase)

        return created


class StandingsService:
    @staticmethod
    def sort_group_teams(group_teams, criteria: list[str] | None = None):
        criteria = criteria or DEFAULT_RANKING

        def key(gt: TournamentPhaseGroupTeam):
            gd = (gt.goals_for or 0) - (gt.goals_against or 0)
            parts = []
            for c in criteria:
                if c == "points":
                    parts.append(-(gt.points or 0))
                elif c in ("goal_difference", "gd"):
                    parts.append(-gd)
                elif c in ("goals_for", "goals_scored", "gf"):
                    parts.append(-(gt.goals_for or 0))
                elif c == "head_to_head":
                    parts.append(0)  # not computed yet
                else:
                    parts.append(0)
            parts.append(gt.order or 0)
            parts.append(gt.id)
            return tuple(parts)

        return sorted(list(group_teams), key=key)

    @staticmethod
    def ranked_teams_per_group(*, group_phase, criteria: list[str] | None = None):
        result = []
        for group in group_phase.groups.order_by("order", "id"):
            teams = list(
                group.group_teams.select_related("team_participation").all()
            )
            result.append(StandingsService.sort_group_teams(teams, criteria))
        return result


class MatchGenerationService:
    """Round-robin with real teams + knockout fill."""

    @staticmethod
    def _scheduled_status() -> MatchStatus:
        status = MatchStatus.objects.filter(code="scheduled").first()
        if status is None:
            status = MatchStatus.objects.first()
        if status is None:
            raise InvalidStateError("No MatchStatus available.")
        return status

    @staticmethod
    def round_robin_pairs(teams: list):
        """Return list of (home, away) for single round-robin."""
        n = len(teams)
        if n < 2:
            return []
        pairs = []
        for i in range(n):
            for j in range(i + 1, n):
                # Alternate home/away by index for mild balance
                if (i + j) % 2 == 0:
                    pairs.append((teams[i], teams[j]))
                else:
                    pairs.append((teams[j], teams[i]))
        return pairs

    @staticmethod
    @transaction.atomic
    def generate_group_round_robin(*, phase, replace: bool = False) -> list[Match]:
        if phase.phase_type != "group_stage":
            raise ValidationError(
                {"phase": "Round-robin only applies to group_stage phases."}
            )
        groups = list(phase.groups.order_by("order", "id"))
        if not groups:
            raise ValidationError(
                {"groups": "Generate groups and assign teams first."}
            )

        status = MatchGenerationService._scheduled_status()
        created: list[Match] = []
        next_num = 1
        existing_nums = Match.objects.filter(tournament_phase=phase).values_list(
            "match_number", flat=True
        )
        nums = [n for n in existing_nums if n is not None]
        if nums:
            next_num = max(nums) + 1

        for group in groups:
            team_rows = list(
                group.group_teams.select_related("team_participation").order_by(
                    "order", "id"
                )
            )
            if len(team_rows) < 2:
                raise ValidationError(
                    {
                        "groups": (
                            f"Group '{group.name}' needs at least 2 teams "
                            "before generating matches."
                        )
                    }
                )
            participations = [row.team_participation for row in team_rows]
            pairs = MatchGenerationService.round_robin_pairs(participations)

            existing = list(group.matches.order_by("match_number", "id"))
            if existing:
                if not replace:
                    # If already fully paired, skip; if TBD-only, replace slots
                    has_teams = any(
                        m.home_team_participation_id or m.away_team_participation_id
                        for m in existing
                    )
                    if has_teams:
                        continue
                if any(m.events.exists() for m in existing):
                    raise InvalidStateError(
                        f"Group '{group.name}' has matches with events."
                    )
                if any(
                    m.status and m.status.code == "finished" for m in existing
                ):
                    raise ConflictError(
                        f"Group '{group.name}' has finished matches."
                    )
                group.matches.all().delete()

            for home, away in pairs:
                created.append(
                    Match.objects.create(
                        tournament_phase=phase,
                        tournament_phase_group=group,
                        home_team_participation=home,
                        away_team_participation=away,
                        match_number=next_num,
                        status=status,
                    )
                )
                next_num += 1

        return created

    @staticmethod
    def auto_cross_pairs(ranked_groups: list[list]) -> list[tuple]:
        """
        Pair A1–B2, B1–A2, C1–D2, D1–C2, …
        ranked_groups: list of group standings (best first), each item is GroupTeam.
        Uses only teams_advancing slots already sliced by caller.
        """
        pairs = []
        n = len(ranked_groups)
        if n == 0:
            return pairs

        # Normalize: each group list of participations (best first)
        groups = [
            [gt.team_participation for gt in gts]
            for gts in ranked_groups
        ]

        # Pair adjacent groups: (0,1), (2,3), ...
        for i in range(0, n, 2):
            g_a = groups[i]
            g_b = groups[i + 1] if i + 1 < n else None
            if g_b is None:
                # Odd group count: pair within using 1st vs 2nd if possible
                if len(g_a) >= 2:
                    pairs.append((g_a[0], g_a[1]))
                continue
            # Classic cross for first two places when available
            if len(g_a) >= 1 and len(g_b) >= 2:
                pairs.append((g_a[0], g_b[1]))
            elif len(g_a) >= 1 and len(g_b) >= 1:
                pairs.append((g_a[0], g_b[0]))
            if len(g_b) >= 1 and len(g_a) >= 2:
                pairs.append((g_b[0], g_a[1]))
        return pairs

    @staticmethod
    @transaction.atomic
    def fill_knockout(*, edition, replace: bool = False, force: bool = False) -> list[Match]:
        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        group_phase = (
            edition.phases.filter(phase_type="group_stage")
            .order_by("order")
            .first()
        )
        if group_phase is None:
            raise ValidationError(
                {"phases": "No group_stage phase found for this edition."}
            )

        if not force:
            unfinished = Match.objects.filter(
                tournament_phase=group_phase,
            ).exclude(status__code="finished")
            if unfinished.exists():
                raise ConflictError(
                    "Group matches are not all finished. "
                    "Pass force=true to fill knockout anyway."
                )

        criteria = cfg.ranking_criteria or DEFAULT_RANKING
        ranked = StandingsService.ranked_teams_per_group(
            group_phase=group_phase,
            criteria=criteria,
        )
        # Slice to advancing per group
        advancing_per = cfg.teams_advancing_per_group
        sliced = [gts[:advancing_per] for gts in ranked if gts]

        # Optional best runners-up (next place across groups)
        if cfg.best_runners_up and cfg.number_of_best_runners_up:
            runners = []
            place_idx = advancing_per  # 0-based next place
            for gts in ranked:
                if len(gts) > place_idx:
                    runners.append(gts[place_idx])
            runners = StandingsService.sort_group_teams(runners, criteria)
            extra = runners[: cfg.number_of_best_runners_up]
            # Attach extras as a synthetic "group" for pairing leftover
            if extra:
                sliced.append(extra)

        first_ko = (
            edition.phases.filter(phase_type__in=["knockout", "third_place"])
            .order_by("order")
            .first()
        )
        if first_ko is None:
            raise ValidationError(
                {"phases": "No knockout phases found. Generate structure first."}
            )

        # Only fill the first knockout round (not third_place)
        first_round = (
            edition.phases.filter(phase_type="knockout")
            .order_by("order")
            .first()
        )
        if first_round is None:
            raise ValidationError({"phases": "No knockout round phase found."})

        status = MatchGenerationService._scheduled_status()
        existing = list(first_round.matches.order_by("match_number", "id"))
        if existing:
            if not replace:
                has_teams = any(
                    m.home_team_participation_id or m.away_team_participation_id
                    for m in existing
                )
                if has_teams:
                    raise ConflictError(
                        "First knockout round already has teams. "
                        "Pass replace=true to rebuild."
                    )
            if any(m.events.exists() for m in existing):
                raise InvalidStateError(
                    "Knockout round has matches with events."
                )
            first_round.matches.all().delete()
            existing = []

        pairing = cfg.pairing_method
        created: list[Match] = []

        if pairing == TournamentFormatConfig.PairingMethod.MANUAL:
            # Create empty TBD slots for expected match count
            from apps.matches.services.match import MatchService

            MatchService.generate_placeholder_matches(
                phase=first_round,
                replace=True,
            )
            return list(first_round.matches.order_by("match_number", "id"))

        pairs = MatchGenerationService.auto_cross_pairs(sliced)
        expected = (first_round.config or {}).get("match_count") or len(pairs)
        # Ensure we don't create more than bracket size
        pairs = pairs[: int(expected)]

        num = 1
        for home, away in pairs:
            created.append(
                Match.objects.create(
                    tournament_phase=first_round,
                    tournament_phase_group=None,
                    home_team_participation=home,
                    away_team_participation=away,
                    match_number=num,
                    status=status,
                )
            )
            num += 1

        # If fewer pairs than expected, pad with TBD
        while len(created) < int(expected):
            created.append(
                Match.objects.create(
                    tournament_phase=first_round,
                    match_number=num,
                    status=status,
                )
            )
            num += 1

        return created

class MatchScheduleService:
    """Assign sequential kickoff times from edition start."""

    @staticmethod
    def _slot_minutes(*, edition, cfg) -> int:
        """How long one match occupies on the schedule (play + break)."""
        duration = None
        if cfg.half_duration_minutes:
            halves = 2
            break_m = cfg.half_time_break_minutes or 0
            duration = int(cfg.half_duration_minutes) * halves + int(break_m)
        elif edition.global_rule_template_id and edition.global_rule_template:
            duration = edition.global_rule_template.match_duration_minutes
        if not duration or duration < 1:
            duration = 60
        buffer = cfg.buffer_between_matches_minutes
        if buffer is None:
            buffer = 15
        return int(duration) + int(buffer)

    @staticmethod
    @transaction.atomic
    def schedule_from_start(
        *,
        edition,
        start_datetime=None,
        match_ids: list[int] | None = None,
        only_unscheduled: bool = False,
        overwrite: bool = True,
    ) -> list[Match]:
        from datetime import datetime, time, timedelta

        from django.utils import timezone

        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)

        if start_datetime is None:
            start_datetime = timezone.make_aware(
                datetime.combine(edition.start_date, time(9, 0)),
                timezone.get_current_timezone(),
            )
        elif timezone.is_naive(start_datetime):
            start_datetime = timezone.make_aware(
                start_datetime,
                timezone.get_current_timezone(),
            )

        qs = Match.objects.filter(
            tournament_phase__tournament_edition=edition,
        ).select_related(
            "tournament_phase",
            "tournament_phase_group",
            "status",
        )
        if match_ids:
            qs = qs.filter(id__in=match_ids)
        if only_unscheduled:
            qs = qs.filter(match_date__isnull=True)

        matches = list(
            qs.order_by(
                "tournament_phase__order",
                "match_number",
                "id",
            )
        )
        if not matches:
            raise ValidationError({"matches": "No matches to schedule."})

        slot = MatchScheduleService._slot_minutes(edition=edition, cfg=cfg)
        cursor = start_datetime
        updated: list[Match] = []
        for match in matches:
            if match.match_date is not None and not overwrite:
                continue
            if (
                match.status_id
                and getattr(match.status, "code", None) == "finished"
                and not match_ids
            ):
                continue
            match.match_date = cursor
            match.save(update_fields=["match_date", "updated_at"])
            updated.append(match)
            cursor = cursor + timedelta(minutes=slot)

        return updated
