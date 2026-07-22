from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from apps.matches.models import Match
from apps.matches.status_codes import FINISHED_MATCH_STATUS_CODES
from apps.tournaments.models import TournamentPhaseGroupTeam

DEFAULT_RANKING = [
    "points",
    "goal_difference",
    "goals_for",
    "head_to_head_points",
    "head_to_head_goal_difference",
    "head_to_head_goals_for",
    "team_name",
]

# Legacy aliases accepted from older format configs / seeds
_CRITERION_ALIASES = {
    "gd": "goal_difference",
    "gf": "goals_for",
    "goals_scored": "goals_for",
    "head_to_head": "head_to_head_points",
}


class StandingsService:
    """Group table ranking with ordered ranking_criteria (incl. H2H)."""

    @staticmethod
    def normalize_criteria(criteria: list[str] | None) -> list[str]:
        raw = criteria or DEFAULT_RANKING
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            key = _CRITERION_ALIASES.get(item.strip(), item.strip())
            if key and key not in out:
                out.append(key)
        return out or list(DEFAULT_RANKING)

    @staticmethod
    def finished_group_matches(*, group) -> list[Match]:
        return list(
            Match.objects.filter(
                tournament_phase_group=group,
                status__code__in=FINISHED_MATCH_STATUS_CODES,
                home_team_participation_id__isnull=False,
                away_team_participation_id__isnull=False,
                home_score__isnull=False,
                away_score__isnull=False,
            ).select_related("home_team_participation", "away_team_participation")
        )

    @staticmethod
    def _team_label(gt: TournamentPhaseGroupTeam) -> str:
        part = gt.team_participation
        name = (getattr(part, "participation_name", None) or "").strip()
        if name:
            return name.casefold()
        team = getattr(part, "team", None)
        return (getattr(team, "name", None) or f"#{part.id}").casefold()

    @staticmethod
    def _h2h_table(
        subset: list[TournamentPhaseGroupTeam],
        matches: Iterable[Match],
    ) -> dict[int, dict[str, int]]:
        ids = {gt.team_participation_id for gt in subset}
        table = {
            pid: {"points": 0, "gd": 0, "gf": 0}
            for pid in ids
        }
        for m in matches:
            home_id = m.home_team_participation_id
            away_id = m.away_team_participation_id
            if home_id not in ids or away_id not in ids:
                continue
            hs = int(m.home_score or 0)
            aws = int(m.away_score or 0)
            table[home_id]["gf"] += hs
            table[away_id]["gf"] += aws
            table[home_id]["gd"] += hs - aws
            table[away_id]["gd"] += aws - hs
            if hs > aws:
                table[home_id]["points"] += 3
            elif hs < aws:
                table[away_id]["points"] += 3
            else:
                table[home_id]["points"] += 1
                table[away_id]["points"] += 1
        return table

    @staticmethod
    def _criterion_value(
        *,
        gt: TournamentPhaseGroupTeam,
        criterion: str,
        subset: list[TournamentPhaseGroupTeam],
        matches: list[Match],
        h2h_cache: dict[int, dict[str, int]] | None,
    ):
        if criterion == "points":
            return gt.points or 0
        if criterion == "goal_difference":
            return (gt.goals_for or 0) - (gt.goals_against or 0)
        if criterion == "goals_for":
            return gt.goals_for or 0
        if criterion == "team_name":
            # Ascending alphabetical → invert so higher sort key = earlier name
            # (we sort buckets by value descending).
            return StandingsService._team_label(gt)
        if criterion.startswith("head_to_head_"):
            if h2h_cache is None:
                h2h_cache = StandingsService._h2h_table(subset, matches)
            row = h2h_cache.get(gt.team_participation_id) or {
                "points": 0,
                "gd": 0,
                "gf": 0,
            }
            if criterion == "head_to_head_points":
                return row["points"]
            if criterion == "head_to_head_goal_difference":
                return row["gd"]
            if criterion == "head_to_head_goals_for":
                return row["gf"]
        return 0

    @staticmethod
    def _rank_recursive(
        subset: list[TournamentPhaseGroupTeam],
        criteria: list[str],
        matches: list[Match],
    ) -> list[TournamentPhaseGroupTeam]:
        if len(subset) <= 1:
            return list(subset)
        if not criteria:
            return sorted(
                subset,
                key=lambda gt: (gt.order or 0, gt.id),
            )

        criterion = criteria[0]
        rest = criteria[1:]
        h2h_cache = None
        if criterion.startswith("head_to_head_"):
            h2h_cache = StandingsService._h2h_table(subset, matches)

        # team_name: ascending; numeric criteria: descending
        ascending = criterion == "team_name"

        buckets: dict = defaultdict(list)
        for gt in subset:
            value = StandingsService._criterion_value(
                gt=gt,
                criterion=criterion,
                subset=subset,
                matches=matches,
                h2h_cache=h2h_cache,
            )
            buckets[value].append(gt)

        ordered_keys = sorted(buckets.keys(), reverse=not ascending)
        ranked: list[TournamentPhaseGroupTeam] = []
        for key in ordered_keys:
            ranked.extend(
                StandingsService._rank_recursive(buckets[key], rest, matches)
            )
        return ranked

    @staticmethod
    def sort_group_teams(
        group_teams,
        criteria: list[str] | None = None,
        *,
        matches: list[Match] | None = None,
        group=None,
    ):
        teams = list(group_teams)
        if not teams:
            return []
        criteria = StandingsService.normalize_criteria(criteria)
        if matches is None:
            if group is None and teams:
                group = teams[0].tournament_phase_group
            matches = (
                StandingsService.finished_group_matches(group=group)
                if group is not None
                else []
            )
        return StandingsService._rank_recursive(teams, criteria, matches)

    @staticmethod
    def ranked_teams_per_group(*, group_phase, criteria: list[str] | None = None):
        criteria = StandingsService.normalize_criteria(criteria)
        result = []
        for group in group_phase.groups.order_by("order", "id"):
            teams = list(
                group.group_teams.select_related(
                    "team_participation",
                    "team_participation__team",
                ).all()
            )
            matches = StandingsService.finished_group_matches(group=group)
            result.append(
                StandingsService.sort_group_teams(
                    teams,
                    criteria,
                    matches=matches,
                    group=group,
                )
            )
        return result
