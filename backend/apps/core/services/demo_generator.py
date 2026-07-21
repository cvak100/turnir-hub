from __future__ import annotations

import random
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.matches.models import EventType, Match
from apps.matches.services.match import MatchEventService, MatchService
from apps.players.models import Player
from apps.players.services.participation import TeamParticipationService
from apps.players.services.participation_player import TeamParticipationPlayerService
from apps.players.services.team import TeamService
from apps.tournaments.models import (
    GlobalRuleTemplate,
    Sport,
    TournamentCategory,
    TournamentFormat,
    TournamentStatus,
)
from apps.tournaments.services.edition import TournamentEditionService
from apps.tournaments.services.format_generation import TournamentFormatConfigService
from apps.tournaments.services.tournament import TournamentService
from apps.users.models import PersonRoleType
from apps.users.services.person import PersonService


TEAM_NAMES = ["Alfa Trojke", "Beta Trojke", "Gama Trojke", "Delta Trojke"]

FIRST_NAMES = [
    "Luka",
    "Jan",
    "Miha",
    "Anze",
    "Tilen",
    "Nejc",
    "Zan",
    "Gal",
    "Matic",
    "Urban",
]
LAST_NAMES = [
    "Novak",
    "Horvat",
    "Kovac",
    "Zupancic",
    "Potocnik",
    "Mlakar",
    "Kos",
    "Vidmar",
    "Golob",
    "Kralj",
]


class DemoTournamentGenerator:
    """Create a complete Trojke 3v3 knockout demo (4 teams)."""

    @staticmethod
    def _require(obj, label: str):
        if obj is None:
            raise ValidationError(
                {
                    "detail": (
                        f"Manjka {label}. Zaženi seed ukaze "
                        "(npr. python manage.py seed_all)."
                    )
                }
            )
        return obj

    @staticmethod
    def _phase_by_round(edition, round_code: str):
        for phase in edition.phases.all():
            cfg = phase.config or {}
            if cfg.get("round_code") == round_code:
                return phase
        return None

    @staticmethod
    def _match_winner_loser(match: Match):
        home = match.home_score or 0
        away = match.away_score or 0
        if home == away:
            # Should not happen after simulation, but break ties toward home.
            return match.home_team_participation, match.away_team_participation
        if home > away:
            return match.home_team_participation, match.away_team_participation
        return match.away_team_participation, match.home_team_participation

    @staticmethod
    def _simulate_match(*, match: Match, rng: random.Random, user=None) -> dict:
        if not match.home_team_participation_id or not match.away_team_participation_id:
            raise ValidationError(
                {"match": f"Match #{match.id} nima obeh ekip."}
            )

        MatchEventService.start_match(match=match)
        match.refresh_from_db()

        goal_type = EventType.objects.filter(code="goal", is_active=True).first()
        yellow_type = EventType.objects.filter(
            code="yellow_card", is_active=True
        ).first()
        DemoTournamentGenerator._require(goal_type, "event type 'goal'")
        DemoTournamentGenerator._require(yellow_type, "event type 'yellow_card'")

        home = match.home_team_participation
        away = match.away_team_participation
        home_players = list(
            Player.objects.filter(
                participations__team_participation=home,
                participations__is_active=True,
            ).distinct()
        )
        away_players = list(
            Player.objects.filter(
                participations__team_participation=away,
                participations__is_active=True,
            ).distinct()
        )
        if not home_players or not away_players:
            raise ValidationError(
                {"players": f"Match #{match.id} nima dovolj igralcev na rosterju."}
            )

        events_created = 0
        goal_count = rng.randint(3, 7)
        for i in range(goal_count):
            side_home = rng.random() < 0.5
            team = home if side_home else away
            players = home_players if side_home else away_players
            player = rng.choice(players)
            minute = max(1, min(16, 1 + i * 2 + rng.randint(0, 1)))
            half = "1" if minute <= 8 else "2"
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": goal_type,
                    "team_participation": team,
                    "player": player,
                    "minute": minute,
                    "half": half,
                    "is_temporary_player": False,
                    "temporary_player_label": "",
                },
                user=user,
            )
            events_created += 1

        # Ensure no draw for knockout advancement.
        match.refresh_from_db()
        if (match.home_score or 0) == (match.away_score or 0):
            side_home = rng.random() < 0.5
            team = home if side_home else away
            players = home_players if side_home else away_players
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": goal_type,
                    "team_participation": team,
                    "player": rng.choice(players),
                    "minute": 16,
                    "half": "2",
                    "is_temporary_player": False,
                    "temporary_player_label": "",
                },
                user=user,
            )
            events_created += 1

        for _ in range(rng.randint(1, 3)):
            side_home = rng.random() < 0.5
            team = home if side_home else away
            players = home_players if side_home else away_players
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": yellow_type,
                    "team_participation": team,
                    "player": rng.choice(players),
                    "minute": rng.randint(1, 16),
                    "half": rng.choice(["1", "2"]),
                    "is_temporary_player": False,
                    "temporary_player_label": "",
                },
                user=user,
            )
            events_created += 1

        MatchEventService.finish_match(match=match)
        match.refresh_from_db()
        return {
            "match_id": match.id,
            "score": f"{match.home_score}:{match.away_score}",
            "events": events_created,
        }

    @staticmethod
    @transaction.atomic
    def run(*, user=None, seed: int | None = None) -> dict:
        rng = random.Random(seed if seed is not None else timezone.now().timestamp())
        stamp = timezone.now().strftime("%m%d-%H%M")
        steps: list[dict] = []

        sport = Sport.objects.filter(is_active=True).order_by("id").first()
        if sport is None:
            sport = Sport.objects.create(name="Nogomet", is_active=True)
            steps.append({"step": "sport", "message": f"Ustvarjen sport #{sport.id}"})
        else:
            steps.append({"step": "sport", "message": f"Sport: {sport.name}"})

        fmt = DemoTournamentGenerator._require(
            TournamentFormat.objects.filter(code="knockout").first(),
            "format 'knockout'",
        )
        category = DemoTournamentGenerator._require(
            TournamentCategory.objects.filter(slug="trojke").first()
            or TournamentCategory.objects.filter(name__icontains="Trojke").first(),
            "kategorija Trojke",
        )
        rules = DemoTournamentGenerator._require(
            GlobalRuleTemplate.objects.filter(name__icontains="Trojke 3v3").first()
            or GlobalRuleTemplate.objects.filter(name__icontains="Trojke").first(),
            "pravila Trojke 3v3",
        )
        status_ongoing = DemoTournamentGenerator._require(
            TournamentStatus.objects.filter(code="ongoing").first(),
            "status ongoing",
        )
        status_finished = DemoTournamentGenerator._require(
            TournamentStatus.objects.filter(code="finished").first(),
            "status finished",
        )
        player_role = DemoTournamentGenerator._require(
            PersonRoleType.objects.filter(code="player").first(),
            "vloga player",
        )

        tournament = TournamentService.create_tournament(
            data={
                "name": f"Demo Trojke {stamp}",
                "sport": sport,
                "description": "Avtomatsko generiran demo turnir (Trojke 3v3, knockout).",
                "is_active": True,
            }
        )
        steps.append(
            {
                "step": "tournament",
                "message": f"Turnir #{tournament.id}: {tournament.name}",
                "id": tournament.id,
            }
        )

        today = date.today()
        edition = TournamentEditionService.create_edition(
            data={
                "tournament": tournament,
                "name": f"Edicija {today.year} Demo",
                "year": today.year,
                "start_date": today,
                "end_date": today + timedelta(days=1),
                "status": status_ongoing,
                "format": fmt,
                "category": category,
                "global_rule_template": rules,
                "max_teams": 4,
                "max_players_per_team": 5,
                "location": "Demo arena",
                "is_public": True,
                "apply_format_phases": False,
            },
            user=user,
        )
        steps.append(
            {
                "step": "edition",
                "message": f"Edicija #{edition.id}",
                "id": edition.id,
            }
        )

        TournamentFormatConfigService.update_config(
            edition=edition,
            data={"has_third_place_match": True},
        )
        phases = TournamentFormatConfigService.generate_structure(
            edition=edition,
            replace=True,
        )
        steps.append(
            {
                "step": "phases",
                "message": "Faze: " + ", ".join(p.name for p in phases),
                "count": len(phases),
            }
        )

        participations = []
        for idx, team_name in enumerate(TEAM_NAMES):
            team = TeamService.create_team(
                data={
                    "name": f"{team_name} {stamp}",
                    "short_name": f"T{idx + 1}",
                    "city": "Ljubljana",
                }
            )
            part = TeamParticipationService.create_participation(
                data={
                    "team": team,
                    "tournament_edition": edition,
                    "participation_name": team.name,
                }
            )
            participations.append(part)

            for j in range(5):
                fn = FIRST_NAMES[(idx * 5 + j) % len(FIRST_NAMES)]
                ln = LAST_NAMES[(idx * 7 + j) % len(LAST_NAMES)]
                person = PersonService.create_person(
                    data={
                        "first_name": fn,
                        "last_name": f"{ln}{idx + 1}{j + 1}",
                        "nickname": f"{fn[0]}{ln[0]}{idx + 1}{j + 1}",
                        "roles": [player_role],
                        "player": {
                            "position": ["GK", "DF", "MF", "FW", "FW"][j],
                            "jersey_number": j + 1,
                        },
                    }
                )
                player = person.player
                TeamParticipationPlayerService.create_participation_player(
                    data={
                        "team_participation": part,
                        "player": player,
                        "jersey_number": j + 1,
                        "position": ["GK", "DF", "MF", "FW", "FW"][j],
                        "is_captain": j == 0,
                        "is_active": True,
                    }
                )

        steps.append(
            {
                "step": "teams_players",
                "message": "4 ekipe × 5 igralcev",
                "teams": [p.participation_name for p in participations],
            }
        )

        edition.refresh_from_db()
        sf_phase = DemoTournamentGenerator._phase_by_round(edition, "semifinal")
        third_phase = DemoTournamentGenerator._phase_by_round(edition, "third_place")
        final_phase = DemoTournamentGenerator._phase_by_round(edition, "final")
        DemoTournamentGenerator._require(sf_phase, "fazo Polfinale")
        DemoTournamentGenerator._require(third_phase, "fazo Za 3. mesto")
        DemoTournamentGenerator._require(final_phase, "fazo Finale")

        for phase in (sf_phase, third_phase, final_phase):
            MatchService.generate_placeholder_matches(phase=phase, replace=True)

        sf_matches = list(sf_phase.matches.order_by("match_number", "id"))
        if len(sf_matches) < 2:
            raise ValidationError({"phases": "Polfinale nima 2 tekem."})

        MatchService.update_match(
            match=sf_matches[0],
            data={
                "home_team_participation": participations[0],
                "away_team_participation": participations[1],
            },
        )
        MatchService.update_match(
            match=sf_matches[1],
            data={
                "home_team_participation": participations[2],
                "away_team_participation": participations[3],
            },
        )
        steps.append(
            {
                "step": "semifinals_setup",
                "message": "Polfinale: ekipe dodeljene",
            }
        )

        sf_results = []
        for m in sf_matches:
            m.refresh_from_db()
            sf_results.append(
                DemoTournamentGenerator._simulate_match(
                    match=m, rng=rng, user=user
                )
            )
        steps.append(
            {
                "step": "semifinals_play",
                "message": "Polfinale odigrano",
                "results": sf_results,
            }
        )

        for m in sf_matches:
            m.refresh_from_db()
        w1, l1 = DemoTournamentGenerator._match_winner_loser(sf_matches[0])
        w2, l2 = DemoTournamentGenerator._match_winner_loser(sf_matches[1])

        final_match = final_phase.matches.order_by("match_number", "id").first()
        third_match = third_phase.matches.order_by("match_number", "id").first()
        DemoTournamentGenerator._require(final_match, "finale tekmo")
        DemoTournamentGenerator._require(third_match, "tekmo za 3. mesto")

        MatchService.update_match(
            match=final_match,
            data={
                "home_team_participation": w1,
                "away_team_participation": w2,
            },
        )
        MatchService.update_match(
            match=third_match,
            data={
                "home_team_participation": l1,
                "away_team_participation": l2,
            },
        )
        steps.append(
            {
                "step": "finals_setup",
                "message": "Finale in 3. mesto: ekipe dodeljene",
            }
        )

        final_match.refresh_from_db()
        third_match.refresh_from_db()
        third_result = DemoTournamentGenerator._simulate_match(
            match=third_match, rng=rng, user=user
        )
        final_result = DemoTournamentGenerator._simulate_match(
            match=final_match, rng=rng, user=user
        )
        steps.append(
            {
                "step": "finals_play",
                "message": "Finale in 3. mesto odigrano",
                "results": [third_result, final_result],
            }
        )

        edition.status = status_finished
        edition.save(update_fields=["status", "updated_at"])

        steps.append(
            {
                "step": "finish",
                "message": "Turnir zaključen",
            }
        )

        final_match.refresh_from_db()
        champion, _ = DemoTournamentGenerator._match_winner_loser(final_match)

        return {
            "tournament_id": tournament.id,
            "edition_id": edition.id,
            "tournament_name": tournament.name,
            "champion": champion.participation_name if champion else None,
            "final_score": f"{final_match.home_score}:{final_match.away_score}",
            "steps": steps,
            "links": {
                "tournament": f"/dashboard_admin/tournaments/{tournament.id}",
                "edition": f"/editions/{edition.id}",
                "matches": f"/editions/{edition.id}/matches",
                "players": f"/editions/{edition.id}/players",
            },
        }
