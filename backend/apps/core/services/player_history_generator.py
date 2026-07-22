from __future__ import annotations

import random
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.matches.models import EventType, Match
from apps.matches.services.match import MatchEventService, MatchService
from apps.matches.status_codes import is_finished_match_status, is_live_match_status
from apps.players.models import Player
from apps.players.services.participation import TeamParticipationService
from apps.players.services.participation_player import TeamParticipationPlayerService
from apps.players.services.team import TeamService
from apps.tournaments.models import (
    GlobalRuleTemplate,
    Sport,
    Tournament,
    TournamentCategory,
    TournamentEdition,
    TournamentFormat,
    TournamentStatus,
)
from apps.tournaments.services.edition import TournamentEditionService
from apps.tournaments.services.format_generation import TournamentFormatConfigService
from apps.tournaments.services.tournament import TournamentService
from apps.users.models import PersonRoleType
from apps.users.services.person import PersonService


SANDBOX_TOURNAMENT_NAME = "[SANDBOX] Player History Lab"

FILLER_FIRST = ["Anej", "Bor", "Cene", "David", "Enej", "Filip", "Grega", "Hugo"]
FILLER_LAST = ["Testnik", "Demo", "Sandbox", "Labski", "Vaja", "Sample"]


class PlayerHistoryGenerator:
    """Reusable sandbox tournament + multi-year events for a hero player."""

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
    def _lookups():
        sport = Sport.objects.filter(is_active=True).order_by("id").first()
        if sport is None:
            sport = Sport.objects.create(name="Nogomet", is_active=True)
        return {
            "sport": sport,
            "fmt": PlayerHistoryGenerator._require(
                TournamentFormat.objects.filter(code="knockout").first(),
                "format knockout",
            ),
            "category": PlayerHistoryGenerator._require(
                TournamentCategory.objects.filter(slug="trojke").first()
                or TournamentCategory.objects.filter(name__icontains="Trojke").first(),
                "kategorija Trojke",
            ),
            "rules": PlayerHistoryGenerator._require(
                GlobalRuleTemplate.objects.filter(name__icontains="Trojke 3v3").first()
                or GlobalRuleTemplate.objects.filter(name__icontains="Trojke").first(),
                "pravila Trojke",
            ),
            "status_ongoing": PlayerHistoryGenerator._require(
                TournamentStatus.objects.filter(code="ongoing").first(),
                "status ongoing",
            ),
            "status_finished": PlayerHistoryGenerator._require(
                TournamentStatus.objects.filter(code="finished").first(),
                "status finished",
            ),
            "player_role": PlayerHistoryGenerator._require(
                PersonRoleType.objects.filter(code="player").first(),
                "vloga player",
            ),
            "goal_type": PlayerHistoryGenerator._require(
                EventType.objects.filter(code="goal", is_active=True).first(),
                "event type goal",
            ),
            "yellow_type": PlayerHistoryGenerator._require(
                EventType.objects.filter(code="yellow_card", is_active=True).first(),
                "event type yellow_card",
            ),
            "red_type": EventType.objects.filter(
                code="red_card", is_active=True
            ).first(),
        }

    @staticmethod
    def _ensure_sandbox_tournament(*, sport, steps: list) -> Tournament:
        tournament = Tournament.objects.filter(name=SANDBOX_TOURNAMENT_NAME).first()
        if tournament:
            steps.append(
                {
                    "step": "sandbox_tournament",
                    "message": f"Uporabljen sandbox turnir #{tournament.id}",
                    "id": tournament.id,
                    "created": False,
                }
            )
            return tournament
        tournament = TournamentService.create_tournament(
            data={
                "name": SANDBOX_TOURNAMENT_NAME,
                "sport": sport,
                "description": (
                    "Trajni sandbox turnir za generator B "
                    "(zgodovina igralcev / profil)."
                ),
                "is_active": True,
            }
        )
        steps.append(
            {
                "step": "sandbox_tournament",
                "message": f"Ustvarjen sandbox turnir #{tournament.id}",
                "id": tournament.id,
                "created": True,
            }
        )
        return tournament

    @staticmethod
    def _resolve_player(*, player_id, player_role, rng: random.Random, steps: list):
        if player_id is not None:
            player = (
                Player.objects.select_related("person").filter(pk=player_id).first()
            )
            if player is None:
                raise ValidationError(
                    {"player_id": f"Igralec #{player_id} ne obstaja."}
                )
            steps.append(
                {
                    "step": "player",
                    "message": (
                        f"Uporabljen igralec #{player.id}: "
                        f"{player.person.last_name} {player.person.first_name}"
                    ),
                    "id": player.id,
                    "created": False,
                }
            )
            return player

        stamp = timezone.now().strftime("%H%M%S")
        fn = rng.choice(["Luka", "Jan", "Nejc", "Tilen", "Gal", "Matic"])
        ln = rng.choice(["Sandbox", "Profilni", "Zgodovinski", "Demo"])
        person = PersonService.create_person(
            data={
                "first_name": fn,
                "last_name": f"{ln}{stamp}",
                "nickname": f"{fn[0]}{ln[0]}{stamp[-3:]}",
                "roles": [player_role],
                "player": {
                    "position": rng.choice(["FW", "MF", "DF"]),
                    "jersey_number": rng.randint(7, 19),
                },
            }
        )
        player = person.player
        steps.append(
            {
                "step": "player",
                "message": (
                    f"Ustvarjen igralec #{player.id}: "
                    f"{person.last_name} {person.first_name}"
                ),
                "id": player.id,
                "created": True,
            }
        )
        return player

    @staticmethod
    def _create_filler_player(*, role, rng: random.Random, tag: str):
        person = PersonService.create_person(
            data={
                "first_name": rng.choice(FILLER_FIRST),
                "last_name": f"{rng.choice(FILLER_LAST)}{tag}",
                "roles": [role],
                "player": {
                    "position": rng.choice(["GK", "DF", "MF", "FW"]),
                    "jersey_number": rng.randint(1, 99),
                },
            }
        )
        return person.player

    @staticmethod
    def _ensure_assignment(*, participation, player, jersey: int, is_captain=False):
        existing = participation.players.filter(player=player).first()
        if existing:
            return existing
        used = set(
            participation.players.exclude(jersey_number=None).values_list(
                "jersey_number", flat=True
            )
        )
        j = jersey if jersey and jersey > 0 else 1
        while j in used:
            j += 1
        return TeamParticipationPlayerService.create_participation_player(
            data={
                "team_participation": participation,
                "player": player,
                "jersey_number": j,
                "position": player.position or "FW",
                "is_captain": is_captain,
                "is_active": True,
            }
        )

    @staticmethod
    def _roster_players(participation):
        return list(
            Player.objects.filter(
                participations__team_participation=participation,
                participations__is_active=True,
            ).distinct()
        )

    @staticmethod
    def _simulate_match(
        *,
        match: Match,
        hero: Player,
        hero_team,
        rng: random.Random,
        goal_type,
        yellow_type,
        red_type,
        user=None,
    ) -> dict:
        code = match.status.code if match.status_id else None
        if is_finished_match_status(code):
            raise ValidationError({"match": f"Match #{match.id} je ze koncan."})
        if not is_live_match_status(code):
            MatchEventService.start_match(match=match)

        match.refresh_from_db()
        home = match.home_team_participation
        away = match.away_team_participation
        home_players = PlayerHistoryGenerator._roster_players(home)
        away_players = PlayerHistoryGenerator._roster_players(away)
        if not home_players or not away_players:
            raise ValidationError({"players": "Roster je prazen."})

        events_created = 0
        hero_goals = 0
        hero_cards = 0

        for i in range(rng.randint(4, 8)):
            use_hero = rng.random() < 0.55
            if use_hero:
                team = hero_team
                player = hero
                hero_goals += 1
            else:
                side_home = rng.random() < 0.5
                team = home if side_home else away
                pool = home_players if side_home else away_players
                player = rng.choice(pool)
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

        match.refresh_from_db()
        if (match.home_score or 0) == (match.away_score or 0):
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": goal_type,
                    "team_participation": hero_team,
                    "player": hero,
                    "minute": 16,
                    "half": "2",
                    "is_temporary_player": False,
                    "temporary_player_label": "",
                },
                user=user,
            )
            events_created += 1
            hero_goals += 1

        for _ in range(rng.randint(1, 3)):
            to_hero = rng.random() < 0.4
            if to_hero:
                team = hero_team
                player = hero
                hero_cards += 1
            else:
                side_home = rng.random() < 0.5
                team = home if side_home else away
                pool = home_players if side_home else away_players
                player = rng.choice(pool)
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": yellow_type,
                    "team_participation": team,
                    "player": player,
                    "minute": rng.randint(1, 16),
                    "half": rng.choice(["1", "2"]),
                    "is_temporary_player": False,
                    "temporary_player_label": "",
                },
                user=user,
            )
            events_created += 1

        if red_type and rng.random() < 0.12:
            opp = away if hero_team.id == home.id else home
            opp_pool = (
                away_players if opp.id == away.id else home_players
            )
            MatchEventService.create_event(
                data={
                    "match": match,
                    "event_type": red_type,
                    "team_participation": opp,
                    "player": rng.choice(opp_pool),
                    "minute": rng.randint(10, 16),
                    "half": "2",
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
            "hero_goals": hero_goals,
            "hero_cards": hero_cards,
        }

    @staticmethod
    def _play_edition_for_year(
        *,
        tournament: Tournament,
        year: int,
        hero: Player,
        lookups: dict,
        rng: random.Random,
        user,
        steps: list,
    ) -> dict:
        stamp = timezone.now().strftime("%H%M%S")
        edition = (
            TournamentEdition.objects.filter(tournament=tournament, year=year)
            .order_by("-id")
            .first()
        )
        created_edition = False
        if edition is None:
            start = date(year, 6, 1)
            edition = TournamentEditionService.create_edition(
                data={
                    "tournament": tournament,
                    "name": f"Sandbox {year}",
                    "year": year,
                    "start_date": start,
                    "end_date": start + timedelta(days=2),
                    "status": lookups["status_ongoing"],
                    "format": lookups["fmt"],
                    "category": lookups["category"],
                    "global_rule_template": lookups["rules"],
                    "max_teams": 2,
                    "max_players_per_team": 8,
                    "location": "Sandbox arena",
                    "is_public": True,
                    "apply_format_phases": False,
                },
                user=user,
            )
            TournamentFormatConfigService.update_config(
                edition=edition,
                data={"has_third_place_match": False},
            )
            TournamentFormatConfigService.generate_structure(
                edition=edition, replace=True
            )
            created_edition = True
        else:
            edition.status = lookups["status_ongoing"]
            edition.save(update_fields=["status", "updated_at"])

        parts = list(edition.team_participations.select_related("team").order_by("id"))
        while len(parts) < 2:
            idx = len(parts) + 1
            team = TeamService.create_team(
                data={
                    "name": f"Sandbox Team {year}-{idx}-{stamp}",
                    "short_name": f"S{year % 100}{idx}",
                    "city": "Sandbox",
                }
            )
            part = TeamParticipationService.create_participation(
                data={
                    "team": team,
                    "tournament_edition": edition,
                    "participation_name": team.name,
                }
            )
            parts.append(part)

        hero_part = parts[0]
        opp_part = parts[1]

        PlayerHistoryGenerator._ensure_assignment(
            participation=hero_part,
            player=hero,
            jersey=hero.preferred_jersey_number or 10,
            is_captain=not hero_part.players.filter(is_captain=True).exists(),
        )

        for part, tag in ((hero_part, f"H{year}"), (opp_part, f"O{year}")):
            count = part.players.count()
            while count < 4:
                filler = PlayerHistoryGenerator._create_filler_player(
                    role=lookups["player_role"],
                    rng=rng,
                    tag=f"{tag}{count}{stamp[-2:]}",
                )
                try:
                    PlayerHistoryGenerator._ensure_assignment(
                        participation=part,
                        player=filler,
                        jersey=count + 1,
                    )
                except Exception:
                    break
                count = part.players.count()

        phase = edition.phases.order_by("order", "id").first()
        if phase is None:
            raise ValidationError({"edition": f"Edicija {year} nima faze."})

        # Only seed TBD slots on a fresh structure. Re-runs often already have
        # more finished matches than the knockout template expects; calling
        # generate_placeholder_matches then raises validation_error.
        if created_edition:
            MatchService.generate_placeholder_matches(phase=phase, replace=False)

        match = (
            phase.matches.filter(
                home_team_participation__isnull=True,
                away_team_participation__isnull=True,
            )
            .order_by("id")
            .first()
        )

        if match is None:
            open_live = [
                m
                for m in phase.matches.select_related("status").order_by("id")
                if not is_finished_match_status(
                    m.status.code if m.status_id else None
                )
            ]
            match = open_live[0] if open_live else None

        if match is None or is_finished_match_status(
            match.status.code if match.status_id else None
        ):
            status = MatchService._default_status()
            if status is None:
                raise ValidationError({"match": "Ni MatchStatus za novo tekmo."})
            last_num = (
                phase.matches.order_by("-match_number")
                .values_list("match_number", flat=True)
                .first()
                or 0
            )
            created = MatchService._create_tbd_matches(
                phase=phase,
                group=None,
                status=status,
                count=1,
                start_number=int(last_num) + 1,
            )
            match = created[0]

        MatchService.update_match(
            match=match,
            data={
                "home_team_participation": hero_part,
                "away_team_participation": opp_part,
            },
        )
        match.refresh_from_db()

        result = PlayerHistoryGenerator._simulate_match(
            match=match,
            hero=hero,
            hero_team=hero_part,
            rng=rng,
            goal_type=lookups["goal_type"],
            yellow_type=lookups["yellow_type"],
            red_type=lookups["red_type"],
            user=user,
        )

        edition.status = lookups["status_finished"]
        edition.save(update_fields=["status", "updated_at"])

        label = "Nova" if created_edition else "Obstojeca"
        steps.append(
            {
                "step": f"year_{year}",
                "message": (
                    f"{label} edicija {year} #{edition.id} · "
                    f"tekma {result['score']} "
                    f"({result['hero_goals']} golov hero)"
                ),
                "edition_id": edition.id,
                "year": year,
                **result,
            }
        )
        return result

    @staticmethod
    @transaction.atomic
    def run(
        *,
        user=None,
        player_id: int | None = None,
        years: int = 3,
        seed: int | None = None,
    ) -> dict:
        years = max(1, min(int(years or 3), 6))
        rng = random.Random(
            seed if seed is not None else timezone.now().timestamp()
        )
        steps: list[dict] = []
        lookups = PlayerHistoryGenerator._lookups()

        tournament = PlayerHistoryGenerator._ensure_sandbox_tournament(
            sport=lookups["sport"],
            steps=steps,
        )
        hero = PlayerHistoryGenerator._resolve_player(
            player_id=player_id,
            player_role=lookups["player_role"],
            rng=rng,
            steps=steps,
        )

        this_year = date.today().year
        year_list = list(range(this_year - years + 1, this_year + 1))
        for year in year_list:
            PlayerHistoryGenerator._play_edition_for_year(
                tournament=tournament,
                year=year,
                hero=hero,
                lookups=lookups,
                rng=rng,
                user=user,
                steps=steps,
            )

        person = hero.person
        latest = tournament.editions.order_by("-year", "-id").first()
        return {
            "player_id": hero.id,
            "player_name": f"{person.last_name} {person.first_name}".strip(),
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "years": year_list,
            "steps": steps,
            "links": {
                "player": f"/players/{hero.id}",
                "tournament": f"/dashboard_admin/tournaments/{tournament.id}",
                "edition": f"/editions/{latest.id}" if latest else "/",
            },
        }
