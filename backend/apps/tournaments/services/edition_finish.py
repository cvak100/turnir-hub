from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from apps.matches.models import Match
from apps.matches.status_codes import (
    COMPLETED_MATCH_STATUS_CODES,
    FINISHED_MATCH_STATUS_CODES,
)
from apps.players.models import Award, PlayerAward
from apps.tournaments.models import (
    Sponsor,
    TournamentEdition,
    TournamentFinalStanding,
    TournamentPrize,
    TournamentStatus,
)
from apps.tournaments.services.format_generation import TournamentFormatConfigService
from apps.tournaments.services.standings import DEFAULT_RANKING, StandingsService

RANKING_CRITERIA_CATALOG = [
    {"code": "points", "label": "Točke"},
    {"code": "goal_difference", "label": "Gol razlika"},
    {"code": "goals_for", "label": "Zadeti goli"},
    {"code": "head_to_head_points", "label": "Medsebojne — točke"},
    {
        "code": "head_to_head_goal_difference",
        "label": "Medsebojne — gol razlika",
    },
    {"code": "head_to_head_goals_for", "label": "Medsebojne — zadeti goli"},
    {"code": "team_name", "label": "Ime ekipe (A–Ž)"},
]

DEFAULT_AWARDS = [
    ("MVP", "mvp", "Najboljši igralec turnirja", 1),
    ("Najboljši strelec", "top_scorer", "Igralec z največ goli", 2),
    ("Najboljši vratar", "best_goalkeeper", "Najboljši vratar", 3),
    ("Najboljši branilec", "best_defender", "Najboljši branilec", 4),
    ("Fair play", "fair_play", "Fair play nagrada", 5),
]


class EditionFinishService:
    """Preview + conclude an edition using existing models only."""

    @staticmethod
    def ensure_default_awards() -> list:
        for name, code, description, order in DEFAULT_AWARDS:
            Award.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": description,
                    "order": order,
                    "is_active": True,
                },
            )
        return list(Award.objects.filter(is_active=True).order_by("order", "name"))

    @staticmethod
    def unfinished_matches(*, edition: TournamentEdition):
        return (
            Match.objects.filter(tournament_phase__tournament_edition=edition)
            .exclude(status__code__in=COMPLETED_MATCH_STATUS_CODES)
            .select_related(
                "status",
                "tournament_phase",
                "home_team_participation",
                "away_team_participation",
            )
            .order_by("tournament_phase__order", "match_number", "id")
        )

    @staticmethod
    def can_finish(*, edition: TournamentEdition) -> bool:
        return not EditionFinishService.unfinished_matches(edition=edition).exists()

    @staticmethod
    def structure_overview(*, edition: TournamentEdition) -> dict:
        phases = list(
            edition.phases.prefetch_related("groups")
            .order_by("order", "id")
        )
        groups = []
        knockout = []
        for phase in phases:
            if phase.phase_type == "group_stage":
                for g in phase.groups.order_by("order", "id"):
                    groups.append(
                        {
                            "id": g.id,
                            "name": g.name,
                            "phase_id": phase.id,
                            "phase_name": phase.name,
                        }
                    )
            else:
                config = phase.config or {}
                knockout.append(
                    {
                        "id": phase.id,
                        "name": phase.name,
                        "phase_type": phase.phase_type,
                        "round_code": config.get("round_code"),
                    }
                )
        return {"groups": groups, "knockout_phases": knockout}

    @staticmethod
    def _match_winner_loser(match: Match):
        if (
            match.home_team_participation_id is None
            or match.away_team_participation_id is None
            or match.home_score is None
            or match.away_score is None
        ):
            return None, None
        hs = int(match.home_score)
        aws = int(match.away_score)
        if hs == aws:
            # Penalties
            hp = match.home_score_penalties
            ap = match.away_score_penalties
            if hp is not None and ap is not None and hp != ap:
                if int(hp) > int(ap):
                    return match.home_team_participation, match.away_team_participation
                return match.away_team_participation, match.home_team_participation
            return None, None
        if hs > aws:
            return match.home_team_participation, match.away_team_participation
        return match.away_team_participation, match.home_team_participation

    @staticmethod
    def _find_phase_match(edition: TournamentEdition, round_code: str) -> Match | None:
        phase = (
            edition.phases.filter(config__round_code=round_code)
            .order_by("order", "id")
            .first()
        )
        if phase is None and round_code == "final":
            phase = (
                edition.phases.filter(
                    Q(phase_type="knockout") | Q(name__icontains="finale")
                )
                .exclude(config__round_code="third_place")
                .order_by("-order", "-id")
                .first()
            )
        if phase is None:
            return None
        return (
            phase.matches.filter(status__code__in=FINISHED_MATCH_STATUS_CODES)
            .order_by("match_number", "id")
            .first()
        )

    @staticmethod
    def propose_final_standings(*, edition: TournamentEdition) -> list[dict]:
        """Build suggested positions from knockout results + leftover teams."""
        placed: dict[int, dict] = {}
        next_pos = 1

        def place(part, position: int, qualification: str = ""):
            if part is None or part.id in placed:
                return
            placed[part.id] = {
                "team_participation_id": part.id,
                "team_name": part.participation_name
                or (part.team.name if part.team_id else f"#{part.id}"),
                "position": position,
                "qualification": qualification,
                "matches_played": None,
                "wins": None,
                "draws": None,
                "losses": None,
                "points": None,
                "goals_for": None,
                "goals_against": None,
                "goal_difference": None,
                "notes": "",
            }

        final = EditionFinishService._find_phase_match(edition, "final")
        if final:
            winner, loser = EditionFinishService._match_winner_loser(final)
            place(winner, 1, "Champion")
            place(loser, 2, "Runner-up")
            next_pos = 3

        third = EditionFinishService._find_phase_match(edition, "third_place")
        if third:
            w3, l3 = EditionFinishService._match_winner_loser(third)
            place(w3, 3, "3rd place")
            place(l3, 4, "4th place")
            next_pos = max(next_pos, 5)

        # Remaining participations — append in name order
        remaining = (
            edition.team_participations.select_related("team")
            .exclude(id__in=placed.keys())
            .order_by("participation_name", "id")
        )
        pos = next_pos
        for part in remaining:
            place(part, pos)
            pos += 1

        # Prefer existing DB rows if present
        existing = {
            row.team_participation_id: row
            for row in edition.final_standings.select_related(
                "team_participation", "team_participation__team"
            )
        }
        if existing:
            rows = []
            for row in sorted(existing.values(), key=lambda r: r.position):
                part = row.team_participation
                rows.append(
                    {
                        "id": row.id,
                        "team_participation_id": part.id,
                        "team_name": part.participation_name
                        or (part.team.name if part.team_id else f"#{part.id}"),
                        "position": row.position,
                        "qualification": row.qualification,
                        "matches_played": row.matches_played,
                        "wins": row.wins,
                        "draws": row.draws,
                        "losses": row.losses,
                        "points": row.points,
                        "goals_for": row.goals_for,
                        "goals_against": row.goals_against,
                        "goal_difference": row.goal_difference,
                        "notes": row.notes,
                    }
                )
            return rows

        return sorted(placed.values(), key=lambda r: r["position"])

    @staticmethod
    def group_standings_tables(*, edition: TournamentEdition) -> list[dict]:
        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        criteria = StandingsService.normalize_criteria(
            cfg.ranking_criteria or DEFAULT_RANKING
        )
        tables: list[dict] = []
        for phase in edition.phases.filter(phase_type="group_stage").order_by(
            "order", "id"
        ):
            groups = list(phase.groups.order_by("order", "id"))
            ranked = StandingsService.ranked_teams_per_group(
                group_phase=phase,
                criteria=criteria,
            )
            for group, teams in zip(groups, ranked):
                rows = []
                for i, gt in enumerate(teams, start=1):
                    part = gt.team_participation
                    gf = gt.goals_for or 0
                    ga = gt.goals_against or 0
                    rows.append(
                        {
                            "position": i,
                            "team_participation_id": part.id,
                            "team_name": part.participation_name
                            or (part.team.name if part.team_id else f"#{part.id}"),
                            "played": gt.played or 0,
                            "wins": gt.wins or 0,
                            "draws": gt.draws or 0,
                            "losses": gt.losses or 0,
                            "points": gt.points or 0,
                            "goals_for": gf,
                            "goals_against": ga,
                            "goal_difference": gf - ga,
                        }
                    )
                tables.append(
                    {
                        "group_id": group.id,
                        "group_name": group.name,
                        "phase_id": phase.id,
                        "phase_name": phase.name,
                        "rows": rows,
                    }
                )
        return tables

    @staticmethod
    def knockout_matches(*, edition: TournamentEdition) -> list[dict]:
        matches = (
            Match.objects.filter(
                tournament_phase__tournament_edition=edition,
                tournament_phase__phase_type__in=["knockout", "third_place"],
            )
            .select_related(
                "status",
                "tournament_phase",
                "home_team_participation",
                "away_team_participation",
            )
            .order_by("tournament_phase__order", "match_number", "id")
        )
        out = []
        for m in matches:
            cfg = m.tournament_phase.config or {}
            hs = m.home_score
            aws = m.away_score
            score = None
            if hs is not None and aws is not None:
                score = f"{hs}:{aws}"
                if m.home_score_penalties is not None and m.away_score_penalties is not None:
                    score = (
                        f"{score} ({m.home_score_penalties}:{m.away_score_penalties} pen.)"
                    )
            out.append(
                {
                    "id": m.id,
                    "match_number": m.match_number,
                    "phase_id": m.tournament_phase_id,
                    "phase_name": m.tournament_phase.name
                    if m.tournament_phase_id
                    else None,
                    "phase_type": m.tournament_phase.phase_type
                    if m.tournament_phase_id
                    else None,
                    "round_code": cfg.get("round_code"),
                    "status_code": m.status.code if m.status_id else None,
                    "status_name": m.status.name if m.status_id else None,
                    "home": (
                        m.home_team_participation.participation_name
                        if m.home_team_participation_id
                        else "TBD"
                    ),
                    "away": (
                        m.away_team_participation.participation_name
                        if m.away_team_participation_id
                        else "TBD"
                    ),
                    "score": score,
                    "link": f"/matches/{m.id}",
                }
            )
        return out

    @staticmethod
    def _person_label(player) -> str:
        person = getattr(player, "person", None)
        if person is None:
            return f"#{player.id}"
        full = f"{person.last_name} {person.first_name}".strip()
        return full or person.nickname or f"#{player.id}"

    @staticmethod
    def award_entries(*, edition: TournamentEdition) -> list[dict]:
        entries = []
        awards = edition.player_awards.select_related(
            "award",
            "player",
            "player__person",
            "team_participation",
        ).prefetch_related("prizes__sponsor").order_by("award__order", "id")
        for pa in awards:
            prize_obj = pa.prizes.order_by("id").first()
            prize = None
            if prize_obj is not None:
                prize = {
                    "id": prize_obj.id,
                    "prize_type": prize_obj.prize_type,
                    "recipient_type": prize_obj.recipient_type,
                    "value": (
                        str(prize_obj.value) if prize_obj.value is not None else None
                    ),
                    "description": prize_obj.description or "",
                    "notes": prize_obj.notes or "",
                    "sponsor_id": prize_obj.sponsor_id,
                    "sponsor_name": (
                        prize_obj.sponsor.name if prize_obj.sponsor_id else None
                    ),
                }
            entries.append(
                {
                    "player_award_id": pa.id,
                    "award_id": pa.award_id,
                    "award_name": pa.award.name if pa.award_id else "",
                    "player_id": pa.player_id,
                    "player_name": EditionFinishService._person_label(pa.player),
                    "team_participation_id": pa.team_participation_id,
                    "notes": pa.notes or "",
                    "prize": prize,
                }
            )
        return entries

    @staticmethod
    def preview(*, edition: TournamentEdition) -> dict:
        unfinished = EditionFinishService.unfinished_matches(edition=edition)
        cfg = TournamentFormatConfigService.get_or_create_for_edition(edition=edition)
        return {
            "edition_id": edition.id,
            "edition_name": edition.name,
            "status": {
                "id": edition.status_id,
                "code": edition.status.code if edition.status_id else None,
                "name": edition.status.name if edition.status_id else None,
            },
            "can_finish": not unfinished.exists(),
            "ranking_criteria": StandingsService.normalize_criteria(
                cfg.ranking_criteria or DEFAULT_RANKING
            ),
            "unfinished_matches": [
                {
                    "id": m.id,
                    "match_number": m.match_number,
                    "phase_id": m.tournament_phase_id,
                    "phase_name": m.tournament_phase.name
                    if m.tournament_phase_id
                    else None,
                    "status_code": m.status.code if m.status_id else None,
                    "status_name": m.status.name if m.status_id else None,
                    "home": (
                        m.home_team_participation.participation_name
                        if m.home_team_participation_id
                        else None
                    ),
                    "away": (
                        m.away_team_participation.participation_name
                        if m.away_team_participation_id
                        else None
                    ),
                    "link": f"/matches/{m.id}",
                }
                for m in unfinished
            ],
            "structure": EditionFinishService.structure_overview(edition=edition),
            "group_standings": EditionFinishService.group_standings_tables(
                edition=edition
            ),
            "knockout_matches": EditionFinishService.knockout_matches(
                edition=edition
            ),
            "proposed_standings": EditionFinishService.propose_final_standings(
                edition=edition
            ),
            "award_entries": EditionFinishService.award_entries(edition=edition),
            "player_awards": list(
                edition.player_awards.select_related(
                    "award", "player", "player__person", "team_participation"
                ).order_by("award__order", "id")
            ),
            "prizes": list(
                edition.prizes.select_related(
                    "sponsor", "player_award", "team_participation"
                ).order_by("id")
            ),
            "awards_catalog": EditionFinishService.ensure_default_awards(),
            "ranking_criteria_catalog": list(RANKING_CRITERIA_CATALOG),
            "edition_teams": [
                {
                    "id": p.id,
                    "name": p.participation_name
                    or (p.team.name if p.team_id else f"#{p.id}"),
                }
                for p in edition.team_participations.select_related("team").order_by(
                    "participation_name", "id"
                )
            ],
            "sponsors": list(
                Sponsor.objects.filter(is_active=True).order_by("name")
            ),
        }

    @staticmethod
    @transaction.atomic
    def replace_final_standings(*, edition: TournamentEdition, rows: list[dict]):
        edition.final_standings.all().delete()
        created = []
        seen_positions = set()
        seen_teams = set()
        for row in rows:
            pos = int(row["position"])
            tid = int(row["team_participation_id"])
            if pos in seen_positions:
                raise ValidationError(
                    {"standings": f"Duplicate position {pos}."}
                )
            if tid in seen_teams:
                raise ValidationError(
                    {"standings": f"Duplicate team_participation {tid}."}
                )
            seen_positions.add(pos)
            seen_teams.add(tid)
            if not edition.team_participations.filter(pk=tid).exists():
                raise ValidationError(
                    {
                        "standings": (
                            f"Team participation #{tid} "
                            "does not belong to this edition."
                        )
                    }
                )
            gd = row.get("goal_difference")
            if gd is None and row.get("goals_for") is not None and row.get(
                "goals_against"
            ) is not None:
                gd = int(row["goals_for"]) - int(row["goals_against"])
            created.append(
                TournamentFinalStanding.objects.create(
                    tournament_edition=edition,
                    team_participation_id=tid,
                    position=pos,
                    matches_played=row.get("matches_played"),
                    wins=row.get("wins"),
                    draws=row.get("draws"),
                    losses=row.get("losses"),
                    points=row.get("points"),
                    goals_for=row.get("goals_for"),
                    goals_against=row.get("goals_against"),
                    goal_difference=gd,
                    qualification=row.get("qualification") or "",
                    notes=row.get("notes") or "",
                )
            )
        return created

    @staticmethod
    @transaction.atomic
    def replace_award_entries(*, edition: TournamentEdition, rows: list[dict]):
        """Replace PlayerAward rows; optional nested prize per award."""
        edition.prizes.all().delete()
        edition.player_awards.all().delete()
        created_awards = []
        for row in rows:
            award_id = row.get("award_id") or row.get("award")
            player_id = row.get("player_id") or row.get("player")
            if not award_id or not player_id:
                raise ValidationError(
                    {"award_entries": "award_id and player_id are required."}
                )
            pa = PlayerAward.objects.create(
                tournament_edition=edition,
                award_id=int(award_id),
                player_id=int(player_id),
                team_participation_id=row.get("team_participation_id")
                or row.get("team_participation"),
                notes=row.get("notes") or "",
            )
            created_awards.append(pa)
            prize = row.get("prize")
            if not prize:
                continue
            prize_type = prize.get("prize_type")
            if not prize_type:
                continue
            recipient_type = prize.get("recipient_type") or "player"
            TournamentPrize.objects.create(
                tournament_edition=edition,
                player_award=pa,
                prize_type=prize_type,
                recipient_type=recipient_type,
                value=prize.get("value"),
                description=prize.get("description") or "",
                notes=prize.get("notes") or "",
                sponsor_id=prize.get("sponsor_id") or prize.get("sponsor"),
                team_participation_id=prize.get("team_participation_id")
                or prize.get("team_participation")
                or row.get("team_participation_id"),
            )
        return created_awards

    @staticmethod
    @transaction.atomic
    def replace_player_awards(*, edition: TournamentEdition, rows: list[dict]):
        edition.player_awards.all().delete()
        created = []
        for row in rows:
            award_id = row.get("award_id") or row.get("award")
            player_id = row.get("player_id") or row.get("player")
            if not award_id or not player_id:
                raise ValidationError(
                    {"player_awards": "award_id and player_id are required."}
                )
            created.append(
                PlayerAward.objects.create(
                    tournament_edition=edition,
                    award_id=int(award_id),
                    player_id=int(player_id),
                    team_participation_id=row.get("team_participation_id")
                    or row.get("team_participation"),
                    notes=row.get("notes") or "",
                )
            )
        return created

    @staticmethod
    @transaction.atomic
    def replace_prizes(*, edition: TournamentEdition, rows: list[dict]):
        edition.prizes.all().delete()
        created = []
        for row in rows:
            prize_type = row.get("prize_type")
            recipient_type = row.get("recipient_type")
            if not prize_type or not recipient_type:
                raise ValidationError(
                    {"prizes": "prize_type and recipient_type are required."}
                )
            created.append(
                TournamentPrize.objects.create(
                    tournament_edition=edition,
                    prize_type=prize_type,
                    recipient_type=recipient_type,
                    value=row.get("value"),
                    description=row.get("description") or "",
                    notes=row.get("notes") or "",
                    sponsor_id=row.get("sponsor_id") or row.get("sponsor"),
                    player_award_id=row.get("player_award_id")
                    or row.get("player_award"),
                    team_participation_id=row.get("team_participation_id")
                    or row.get("team_participation"),
                )
            )
        return created

    @staticmethod
    @transaction.atomic
    def ensure_award(*, name: str, code: str | None = None) -> Award:
        name = (name or "").strip()
        if not name:
            raise ValidationError({"award": "Name is required."})
        slug = (code or name).strip().lower().replace(" ", "_")[:50]
        existing = Award.objects.filter(code=slug).first()
        if existing:
            return existing
        return Award.objects.create(
            name=name,
            code=slug,
            is_active=True,
            order=Award.objects.count(),
        )

    @staticmethod
    @transaction.atomic
    def finish(
        *,
        edition: TournamentEdition,
        standings: list[dict] | None = None,
        award_entries: list[dict] | None = None,
        player_awards: list[dict] | None = None,
        prizes: list[dict] | None = None,
        new_awards: list[dict] | None = None,
    ) -> TournamentEdition:
        if not EditionFinishService.can_finish(edition=edition):
            raise ValidationError(
                {
                    "matches": (
                        "Cannot finish edition: some matches are not "
                        "finished/cancelled."
                    )
                }
            )

        created_catalog: list[Award] = []
        for item in new_awards or []:
            created_catalog.append(
                EditionFinishService.ensure_award(
                    name=item.get("name", ""),
                    code=item.get("code"),
                )
            )

        if standings is not None:
            EditionFinishService.replace_final_standings(
                edition=edition,
                rows=standings,
            )
        elif not edition.final_standings.exists():
            EditionFinishService.replace_final_standings(
                edition=edition,
                rows=EditionFinishService.propose_final_standings(edition=edition),
            )

        if award_entries is not None:
            # Resolve award_id="new" / pending names via new_awards[0] if needed
            resolved = []
            for row in award_entries:
                entry = dict(row)
                award_id = entry.get("award_id")
                if award_id in (None, "", "new") and created_catalog:
                    entry["award_id"] = created_catalog[0].id
                if entry.get("new_award_name"):
                    award = EditionFinishService.ensure_award(
                        name=str(entry["new_award_name"])
                    )
                    entry["award_id"] = award.id
                resolved.append(entry)
            EditionFinishService.replace_award_entries(
                edition=edition,
                rows=resolved,
            )
        else:
            if player_awards is not None:
                EditionFinishService.replace_player_awards(
                    edition=edition,
                    rows=player_awards,
                )
            if prizes is not None:
                EditionFinishService.replace_prizes(edition=edition, rows=prizes)

        finished = TournamentStatus.objects.filter(code="finished").first()
        if finished is None:
            raise ValidationError(
                {"status": "TournamentStatus 'finished' is not configured."}
            )
        edition.status = finished
        edition.save(update_fields=["status", "updated_at"])
        return edition
