from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.services.demo_generator import DemoTournamentGenerator
from apps.matches.models import EventType, Match
from apps.matches.services.match import MatchEventService, MatchService
from apps.players.models import Award, Player
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
from apps.tournaments.services.edition_finish import EditionFinishService
from apps.tournaments.services.group import (
    TournamentPhaseGroupService,
    TournamentPhaseGroupTeamService,
)
from apps.tournaments.services.phase import TournamentPhaseService
from apps.tournaments.services.tournament import TournamentService
from apps.users.models import PersonRoleType
from apps.users.services.person import PersonService

TZ = ZoneInfo("Europe/Ljubljana")
DAY = date(2009, 8, 22)

# Demo rosters inspired by a 2009 local format (names anonymized)
TEAM_ROSTERS: dict[str, list[str]] = {
    "Ekipa Alfa": [
        "Nejc Kos",
        "Grega Krajnc",
        "Blaz Potocnik",
        "Primoz Zagar",
        "Matic Vidmar",
        "Tim Golob",
        "Denis Furlan",
    ],
    "Ekipa Beta": [
        "Mark Golob",
        "Gal Kralj",
        "Miha Vidmar",
        "Erik Potocnik",
        "Lan Jereb",
        "Nejc Zagar",
        "Ales Hribar",
    ],
    "Ekipa Gama": [
        "David Oblak",
        "Niko Turk",
        "Tilen Hribar",
        "Erik Horvat",
        "Tim Kralj",
        "Primoz Potocnik",
        "Jure Turk",
        "Tim Horvat",
    ],
    "Ekipa Delta": [
        "Gal Hribar",
        "Rok Zajc",
        "Erik Pavlic",
        "Denis Kolar",
        "Matej Kotnik",
        "Vid Oblak",
        "David Kralj",
    ],
    "Ekipa Epsilon": [
        "Aljaz Lesjak",
        "Blaz Lesjak",
        "Tilen Vodopivec",
        "Tim Kovac",
        "Denis Vidmar",
        "Erik Golob",
        "Niko Kos",
        "Zan Golob",
    ],
    "Ekipa Zeta": [
        "Sandi Zagar",
        "Nejc Zajc",
        "Sandi Hribar",
        "Nejc Bizjak",
        "Nejc Golob",
        "Simon Pavlic",
        "Lan Kos",
    ],
    "Ekipa Eta": [
        "Luka Kotnik",
        "Primoz Lesjak",
        "Simon Horvat",
        "Anze Erjavec",
        "Niko Furlan",
        "Aljaz Potocnik",
    ],
    "Ekipa Theta": [
        "Primoz Pavlic",
        "Anze Rozman",
        "Primoz Kotnik",
        "Gal Oblak",
        "Simon Zagar",
        "Ales Golob",
        "Vid Mlakar",
        "Denis Bizjak",
        "Jan Sever",
    ],
    "Ekipa Iota": [
        "Primoz Horvat",
        "Tim Rozman",
        "Simon Potocnik",
        "Erik Kolar",
        "Blaz Golob",
        "David Kos",
        "Jure Krajnc",
        "Grega Kotnik",
        "Aljaz Kralj",
        "Mark Novak",
    ],
    "Ekipa Kappa": [
        "Mark Jereb",
        "Niko Kovac",
        "Grega Pavlic",
        "Lan Hribar",
        "Simon Zajc",
        "Luka Sever",
        "Luka Vidmar",
    ],
    "Ekipa Lambda": [
        "Urban Vidmar",
        "Matic Zupancic",
        "Ales Vidmar",
        "Matej Zupancic",
        "Matej Kralj",
        "Luka Petek",
        "Mark Vodopivec",
    ],
    "Ekipa Mu": [
        "Gal Kovac",
        "David Erjavec",
        "Ales Erjavec",
        "Anze Kolar",
        "Luka Turk",
        "David Krajnc",
        "Bor Pavlic",
    ],
}

# Historical note typos / alternate spellings → roster name
PLAYER_ALIASES: dict[str, str] = {
    "Primoz Sever": "Simon Pavlic",
}

GROUPS = {
    "A": ["Ekipa Epsilon", "Ekipa Alfa", "Ekipa Theta"],
    "B": ["Ekipa Kappa", "Ekipa Zeta", "Ekipa Beta"],
    "C": ["Ekipa Delta", "Ekipa Gama", "Ekipa Iota"],
    "D": ["Ekipa Lambda", "Ekipa Mu", "Ekipa Eta"],
}

# Scorer entry: (full_name, count) — own goals marked separately
# Match: home, away, hh:mm, home_scorers, away_scorers, notes, pens=(h,a)|None, abandoned
MatchSpec = tuple  # typed loosely for readability


def _parse_name(full: str) -> tuple[str, str]:
    parts = full.strip().split()
    if len(parts) == 1:
        return parts[0], "Igralec"
    return parts[0], " ".join(parts[1:])


def _at(hour: int, minute: int) -> datetime:
    return datetime.combine(DAY, time(hour, minute), tzinfo=TZ)


class Local2009DemoGenerator:
    """
    Generator C — anonymized demo of a 2009-style local 4+1 tournament
    (12 teams, 4 groups). Real personal names are not included.
    """

    @staticmethod
    def _require(obj, label: str):
        return DemoTournamentGenerator._require(obj, label)

    @staticmethod
    def _resolve_name(name: str) -> str:
        return PLAYER_ALIASES.get(name, name)

    @staticmethod
    def _player_map(participation) -> dict[str, Player]:
        rows = (
            Player.objects.filter(participations__team_participation=participation)
            .select_related("person")
            .distinct()
        )
        out: dict[str, Player] = {}
        for p in rows:
            person = p.person
            key = f"{person.first_name} {person.last_name}".strip()
            out[key] = p
        return out

    @staticmethod
    def _lookup_player(players: dict[str, Player], name: str) -> Player | None:
        resolved = Local2009DemoGenerator._resolve_name(name)
        return players.get(resolved) or players.get(name)

    @staticmethod
    def _add_player_to_roster(*, part, full_name: str, jersey: int | None, player_role):
        fn, ln = _parse_name(full_name)
        person = PersonService.create_person(
            data={
                "first_name": fn,
                "last_name": ln,
                "nickname": "",
                "roles": [player_role],
                "player": {
                    "position": "MF",
                    "jersey_number": jersey,
                },
            }
        )
        payload = {
            "team_participation": part,
            "player": person.player,
            "position": "MF",
            "is_active": True,
        }
        if jersey is not None:
            payload["jersey_number"] = jersey
        TeamParticipationPlayerService.create_participation_player(data=payload)
        return person.player

    @staticmethod
    def _renumber_roster(*, part, roster: list[str]) -> None:
        from apps.players.models import TeamParticipationPlayer

        pmap = Local2009DemoGenerator._player_map(part)
        # Clear first to avoid unique collisions while swapping
        TeamParticipationPlayer.objects.filter(team_participation=part).update(
            jersey_number=None
        )
        for i, full in enumerate(roster, start=1):
            player = pmap.get(full)
            if player is None:
                continue
            TeamParticipationPlayer.objects.filter(
                team_participation=part,
                player=player,
            ).update(jersey_number=i)

    @staticmethod
    def _sync_roster(*, part, roster: list[str], player_role) -> dict[str, Player]:
        """Ensure participation has all roster names (does not remove extras)."""
        current = Local2009DemoGenerator._player_map(part)
        for full in roster:
            if full not in current:
                current[full] = Local2009DemoGenerator._add_player_to_roster(
                    part=part,
                    full_name=full,
                    jersey=None,
                    player_role=player_role,
                )
        return {name: current[name] for name in roster}

    @staticmethod
    def _add_goals(
        *,
        match: Match,
        team,
        scorers: list[tuple[str, int]],
        players: dict[str, Player],
        goal_type,
        start_minute: int,
        user,
        own_goals: list[tuple[str, int]] | None = None,
        own_goal_type=None,
        opposing_players: dict[str, Player] | None = None,
        opposing_team=None,
    ) -> int:
        created = 0
        minute = start_minute
        for name, count in scorers:
            player = Local2009DemoGenerator._lookup_player(players, name)
            if player is None:
                raise ValidationError(
                    {"players": f"Manjka igralec '{name}' na rosterju ({team})."}
                )
            for _ in range(count):
                half = "1" if minute <= 20 else "2"
                MatchEventService.create_event(
                    data={
                        "match": match,
                        "event_type": goal_type,
                        "team_participation": team,
                        "player": player,
                        "minute": min(minute, 40),
                        "half": half,
                        "is_temporary_player": False,
                        "temporary_player_label": "",
                        "is_own_goal": False,
                    },
                    user=user,
                )
                created += 1
                minute += 2

        for name, count in own_goals or []:
            # Own goal: scorer is on opposing team; credit goes to `team`.
            og_player = Local2009DemoGenerator._lookup_player(
                opposing_players or {}, name
            )
            if og_player is None or opposing_team is None:
                raise ValidationError(
                    {"players": f"Manjka avtogolist '{name}'."}
                )
            et = own_goal_type or goal_type
            for _ in range(count):
                half = "1" if minute <= 20 else "2"
                MatchEventService.create_event(
                    data={
                        "match": match,
                        "event_type": et,
                        "team_participation": opposing_team,
                        "player": og_player,
                        "minute": min(minute, 40),
                        "half": half,
                        "is_temporary_player": False,
                        "temporary_player_label": "",
                        "is_own_goal": True,
                    },
                    user=user,
                )
                created += 1
                minute += 2
        return created

    @staticmethod
    @transaction.atomic
    def repair_existing() -> dict:
        """
        Fix existing demo C editions: anonymized rosters,
        remap events/awards, remove wrong players.
        """
        from apps.matches.models import MatchEvent
        from apps.players.models import PlayerAward, TeamParticipationPlayer
        from apps.tournaments.models import TournamentEdition
        from apps.users.models import Person

        player_role = Local2009DemoGenerator._require(
            PersonRoleType.objects.filter(code="player").first(),
            "vloga player",
        )

        editions = list(
            TournamentEdition.objects.filter(
                name__in=["Demo lokalni 2009", "Local 2009 demo"]
            ).order_by("id")
        )
        report = {"editions": [], "count": len(editions)}

        for edition in editions:
            ed_report = {
                "edition_id": edition.id,
                "tournament": edition.tournament.name,
                "teams": {},
                "events_remapped": 0,
                "awards_remapped": 0,
                "removed_players": 0,
            }
            parts_by_name = {
                p.participation_name: p
                for p in edition.team_participations.all()
            }

            # 1) Sync rosters (add missing correct players)
            synced: dict[str, dict[str, Player]] = {}
            for team_name, roster in TEAM_ROSTERS.items():
                part = parts_by_name.get(team_name)
                if part is None:
                    raise ValidationError(
                        {"teams": f"Edition {edition.id}: manjka ekipa {team_name}"}
                    )
                before = set(Local2009DemoGenerator._player_map(part))
                synced[team_name] = Local2009DemoGenerator._sync_roster(
                    part=part, roster=roster, player_role=player_role
                )
                after = set(synced[team_name])
                ed_report["teams"][team_name] = {
                    "roster_size": len(roster),
                    "added": sorted(after - before),
                    "kept": sorted(after & before),
                }

            # 2) Remap match events to correct player on event's team
            events = MatchEvent.objects.filter(
                match__tournament_phase__tournament_edition=edition,
                player__isnull=False,
                team_participation__isnull=False,
            ).select_related("player__person", "team_participation")
            for event in events:
                person = event.player.person
                old_name = f"{person.first_name} {person.last_name}".strip()
                resolved = Local2009DemoGenerator._resolve_name(old_name)
                pmap = Local2009DemoGenerator._player_map(event.team_participation)
                new_player = pmap.get(resolved)
                if new_player is None:
                    # Try alias reverse / keep if already correct roster name
                    raise ValidationError(
                        {
                            "events": (
                                f"Edition {edition.id} event #{event.id}: "
                                f"ni igralca '{resolved}' na "
                                f"{event.team_participation.participation_name}"
                            )
                        }
                    )
                if new_player.id != event.player_id:
                    event.player = new_player
                    event.save(update_fields=["player"])
                    ed_report["events_remapped"] += 1

            # 3) Remap awards
            for award in PlayerAward.objects.filter(
                tournament_edition=edition
            ).select_related("player__person", "team_participation"):
                person = award.player.person
                old_name = f"{person.first_name} {person.last_name}".strip()
                resolved = Local2009DemoGenerator._resolve_name(old_name)
                part = award.team_participation
                if part is None:
                    continue
                pmap = Local2009DemoGenerator._player_map(part)
                new_player = pmap.get(resolved)
                if new_player and new_player.id != award.player_id:
                    award.player = new_player
                    award.save(update_fields=["player"])
                    ed_report["awards_remapped"] += 1

            # 4) Remove players not on historical roster
            orphan_player_ids: list[int] = []
            for team_name, roster in TEAM_ROSTERS.items():
                part = parts_by_name[team_name]
                desired = set(roster)
                current = Local2009DemoGenerator._player_map(part)
                for name, player in current.items():
                    if name in desired:
                        continue
                    # Safety: no events should still point here for this edition
                    still = MatchEvent.objects.filter(
                        match__tournament_phase__tournament_edition=edition,
                        player=player,
                    ).exists()
                    if still:
                        raise ValidationError(
                            {
                                "players": (
                                    f"Ne morem odstraniti '{name}' — "
                                    f"še ima evente (edition {edition.id})."
                                )
                            }
                        )
                    TeamParticipationPlayer.objects.filter(
                        team_participation=part,
                        player=player,
                    ).delete()
                    orphan_player_ids.append(player.id)
                    ed_report["removed_players"] += 1

            # 5) Renumber jerseys 1..n per historical roster order
            for team_name, roster in TEAM_ROSTERS.items():
                Local2009DemoGenerator._renumber_roster(
                    part=parts_by_name[team_name],
                    roster=roster,
                )

            # 6) Delete orphan persons/players with no remaining assignments
            for pid in orphan_player_ids:
                still_assigned = TeamParticipationPlayer.objects.filter(
                    player_id=pid
                ).exists()
                still_events = MatchEvent.objects.filter(player_id=pid).exists()
                still_awards = PlayerAward.objects.filter(player_id=pid).exists()
                if still_assigned or still_events or still_awards:
                    continue
                person_id = (
                    Player.objects.filter(pk=pid)
                    .values_list("person_id", flat=True)
                    .first()
                )
                if person_id:
                    Person.objects.filter(pk=person_id).delete()

            # Final check: roster sizes
            for team_name, roster in TEAM_ROSTERS.items():
                part = parts_by_name[team_name]
                got = sorted(Local2009DemoGenerator._player_map(part))
                want = sorted(roster)
                if got != want:
                    raise ValidationError(
                        {
                            "roster": (
                                f"Edition {edition.id} {team_name}: "
                                f"got {got} want {want}"
                            )
                        }
                    )

            report["editions"].append(ed_report)

        return report

    @staticmethod
    def _play_match(
        *,
        match: Match,
        home_scorers: list[tuple[str, int]],
        away_scorers: list[tuple[str, int]],
        home_own_goals: list[tuple[str, int]] | None = None,
        away_own_goals: list[tuple[str, int]] | None = None,
        pens: tuple[int, int] | None = None,
        notes: str = "",
        goal_type,
        own_goal_type,
        user,
    ) -> dict:
        home = match.home_team_participation
        away = match.away_team_participation
        home_players = Local2009DemoGenerator._player_map(home)
        away_players = Local2009DemoGenerator._player_map(away)

        MatchEventService.start_match(match=match)
        events = 0
        events += Local2009DemoGenerator._add_goals(
            match=match,
            team=home,
            scorers=home_scorers,
            players=home_players,
            goal_type=goal_type,
            start_minute=3,
            user=user,
            own_goals=home_own_goals,
            own_goal_type=own_goal_type,
            opposing_players=away_players,
            opposing_team=away,
        )
        events += Local2009DemoGenerator._add_goals(
            match=match,
            team=away,
            scorers=away_scorers,
            players=away_players,
            goal_type=goal_type,
            start_minute=4,
            user=user,
            own_goals=away_own_goals,
            own_goal_type=own_goal_type,
            opposing_players=home_players,
            opposing_team=home,
        )
        MatchEventService.finish_match(match=match)
        match.refresh_from_db()

        if pens is not None:
            MatchService.update_match(
                match=match,
                data={
                    "home_score_penalties": pens[0],
                    "away_score_penalties": pens[1],
                    "is_penalties": True,
                    "notes": notes or match.notes,
                },
            )
            match.refresh_from_db()
        elif notes:
            MatchService.update_match(match=match, data={"notes": notes})
            match.refresh_from_db()

        score = f"{match.home_score}:{match.away_score}"
        if pens:
            score = f"{score} ({pens[0]}:{pens[1]} pen.)"
        return {"match_id": match.id, "score": score, "events": events}

    @staticmethod
    def _make_match(
        *,
        phase,
        group=None,
        home,
        away,
        kickoff: datetime,
        match_number: int,
    ) -> Match:
        return MatchService.create_match(
            data={
                "tournament_phase": phase,
                "tournament_phase_group": group,
                "home_team_participation": home,
                "away_team_participation": away,
                "match_date": kickoff,
                "match_number": match_number,
                "notes": "",
            }
        )

    @staticmethod
    @transaction.atomic
    def run(*, user=None) -> dict:
        steps: list[dict] = []

        if user is None:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = (
                User.objects.filter(is_superuser=True).order_by("id").first()
                or User.objects.order_by("id").first()
            )
            if user is None:
                raise ValidationError(
                    {"user": "Za generator je potreben vsaj en uporabnik."}
                )

        sport = Sport.objects.filter(is_active=True).order_by("id").first()
        if sport is None:
            sport = Sport.objects.create(name="Nogomet", is_active=True)
        steps.append({"step": "sport", "message": f"Šport: {sport.name}"})

        fmt = Local2009DemoGenerator._require(
            TournamentFormat.objects.filter(code="group_knockout").first(),
            "format 'group_knockout'",
        )
        category = Local2009DemoGenerator._require(
            TournamentCategory.objects.filter(slug="malonogometni").first()
            or TournamentCategory.objects.filter(name__icontains="Malonogomet").first()
            or TournamentCategory.objects.filter(slug="futsal").first(),
            "kategorija Malonogometni/Futsal",
        )
        rules = Local2009DemoGenerator._require(
            GlobalRuleTemplate.objects.filter(name__icontains="4+1").first()
            or GlobalRuleTemplate.objects.filter(name__icontains="Futsal").first(),
            "pravila 4+1 Futsal",
        )
        status_ongoing = Local2009DemoGenerator._require(
            TournamentStatus.objects.filter(code="ongoing").first(),
            "status ongoing",
        )
        player_role = Local2009DemoGenerator._require(
            PersonRoleType.objects.filter(code="player").first(),
            "vloga player",
        )
        goal_type = Local2009DemoGenerator._require(
            EventType.objects.filter(code="goal", is_active=True).first(),
            "event type goal",
        )
        own_goal_type = (
            EventType.objects.filter(code="own_goal", is_active=True).first()
            or goal_type
        )

        stamp = timezone.now().strftime("%H%M%S")
        tournament = TournamentService.create_tournament(
            data={
                "name": f"Demo lokalni turnir 4+1 ({stamp})",
                "sport": sport,
                "description": (
                    "Anonimiziran demo: lokalni malonogometni turnir "
                    "(format 4+1, 12 ekip, 4 skupine, četrtfinale–finale)."
                ),
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

        edition = TournamentEditionService.create_edition(
            data={
                "tournament": tournament,
                "name": "Demo lokalni 2009",
                "year": 2009,
                "start_date": DAY,
                "end_date": DAY,
                "status": status_ongoing,
                "format": fmt,
                "category": category,
                "global_rule_template": rules,
                "max_teams": 12,
                "max_players_per_team": 12,
                "location": "Demo lokacija",
                "is_public": True,
                "public_rules": (
                    "Sistem 4+1. 12 ekip v 4 skupinah po 3. "
                    "Iz vsake skupine napredujeta 2 najboljši ekipi."
                ),
                "apply_format_phases": False,
            },
            user=user,
        )
        steps.append(
            {
                "step": "edition",
                "message": f"Edicija #{edition.id}: Demo lokalni 2009",
                "id": edition.id,
            }
        )

        # Teams + rosters (anonymized demo lists)
        parts: dict[str, object] = {}
        for team_name, roster in TEAM_ROSTERS.items():
            team = TeamService.create_team(
                data={
                    "name": f"{team_name} ({stamp})",
                    "short_name": team_name[:20],
                    "city": "Demo",
                }
            )
            part = TeamParticipationService.create_participation(
                data={
                    "team": team,
                    "tournament_edition": edition,
                    "participation_name": team_name,
                }
            )
            parts[team_name] = part
            for i, full in enumerate(roster, start=1):
                Local2009DemoGenerator._add_player_to_roster(
                    part=part,
                    full_name=full,
                    jersey=i,
                    player_role=player_role,
                )
        steps.append(
            {
                "step": "teams",
                "message": (
                    f"12 ekip + tocni rosterji "
                    f"({sum(len(v) for v in TEAM_ROSTERS.values())} igralcev)"
                ),
                "teams": list(TEAM_ROSTERS.keys()),
            }
        )

        # Phases
        group_phase = TournamentPhaseService.create_phase(
            data={
                "tournament_edition": edition,
                "name": "Skupinski del",
                "phase_type": "group_stage",
                "order": 1,
                "status": "completed",
                "config": {"number_of_groups": 4, "teams_per_group": 3},
            }
        )
        qf_phase = TournamentPhaseService.create_phase(
            data={
                "tournament_edition": edition,
                "name": "Četrtfinale",
                "phase_type": "knockout",
                "order": 2,
                "status": "completed",
                "config": {"round_code": "quarterfinal"},
            }
        )
        sf_phase = TournamentPhaseService.create_phase(
            data={
                "tournament_edition": edition,
                "name": "Polfinale",
                "phase_type": "knockout",
                "order": 3,
                "status": "completed",
                "config": {"round_code": "semifinal"},
            }
        )
        third_phase = TournamentPhaseService.create_phase(
            data={
                "tournament_edition": edition,
                "name": "Za 3. mesto",
                "phase_type": "third_place",
                "order": 4,
                "status": "completed",
                "config": {"round_code": "third_place"},
            }
        )
        final_phase = TournamentPhaseService.create_phase(
            data={
                "tournament_edition": edition,
                "name": "Finale",
                "phase_type": "knockout",
                "order": 5,
                "status": "completed",
                "config": {"round_code": "final"},
            }
        )
        steps.append(
            {
                "step": "phases",
                "message": "Faze: skupine, cetrtfinale, polfinale, 3. mesto, finale",
            }
        )

        group_objs = {}
        for i, letter in enumerate("ABCD"):
            g = TournamentPhaseGroupService.create_group(
                data={
                    "tournament_phase": group_phase,
                    "name": f"Skupina {letter}",
                    "order": i + 1,
                    "max_teams": 3,
                }
            )
            group_objs[letter] = g
            for j, team_name in enumerate(GROUPS[letter]):
                TournamentPhaseGroupTeamService.create_group_team(
                    data={
                        "tournament_phase_group": g,
                        "team_participation": parts[team_name],
                        "order": j + 1,
                    }
                )

        # Group matches
        group_specs = [
            # A
            ("A", "Ekipa Alfa", "Ekipa Theta", 10, 0, [("Blaz Potocnik", 5), ("Primoz Zagar", 1), ("Matic Vidmar", 1)], [("Gal Oblak", 2)], None, ""),
            ("A", "Ekipa Epsilon", "Ekipa Theta", 11, 0, [("Niko Kos", 4), ("Zan Golob", 2), ("Tim Kovac", 1), ("Denis Vidmar", 1), ("Erik Golob", 1)], [], None, ""),
            ("A", "Ekipa Epsilon", "Ekipa Alfa", 12, 30, [("Aljaz Lesjak", 1), ("Denis Vidmar", 1), ("Zan Golob", 1)], [("Blaz Potocnik", 1)], None, ""),
            # B
            ("B", "Ekipa Beta", "Ekipa Zeta", 10, 30, [("Gal Kralj", 1)], [("Sandi Zagar", 1), ("Nejc Zajc", 1), ("Sandi Hribar", 1)], None, ""),
            ("B", "Ekipa Kappa", "Ekipa Beta", 11, 30, [("Luka Vidmar", 1)], [], None, ""),
            ("B", "Ekipa Kappa", "Ekipa Zeta", 13, 0, [("Mark Jereb", 2), ("Lan Hribar", 2), ("Grega Pavlic", 1)], [("Nejc Zajc", 2)], None, ""),
            # C
            ("C", "Ekipa Delta", "Ekipa Iota", 12, 0, [("Gal Hribar", 1), ("Rok Zajc", 1)], [], None, ""),
            ("C", "Ekipa Gama", "Ekipa Iota", 14, 0, [("Niko Turk", 2), ("Erik Horvat", 2), ("Jure Turk", 2), ("David Oblak", 1)], [("Mark Novak", 2)], None, ""),
            ("C", "Ekipa Delta", "Ekipa Gama", 15, 0, [], [("Jure Turk", 1)], None, "Tekma predčasno končana zaradi poškodbe."),
            # D
            ("D", "Ekipa Lambda", "Ekipa Eta", 13, 30, [("Luka Petek", 1)], [], None, ""),
            ("D", "Ekipa Mu", "Ekipa Eta", 14, 30, [("Gal Kovac", 3), ("David Erjavec", 2), ("Bor Pavlic", 1)], [], None, ""),
            ("D", "Ekipa Lambda", "Ekipa Mu", 15, 30, [], [], (3, 2), "Odločitev po penalih (strelci penalov niso navedeni)."),
        ]

        results = []
        n = 1
        for letter, home_n, away_n, hh, mm, hs, aws, pens, notes in group_specs:
            m = Local2009DemoGenerator._make_match(
                phase=group_phase,
                group=group_objs[letter],
                home=parts[home_n],
                away=parts[away_n],
                kickoff=_at(hh, mm),
                match_number=n,
            )
            n += 1
            results.append(
                Local2009DemoGenerator._play_match(
                    match=m,
                    home_scorers=hs,
                    away_scorers=aws,
                    pens=pens,
                    notes=notes,
                    goal_type=goal_type,
                    own_goal_type=own_goal_type,
                    user=user,
                )
            )
        steps.append(
            {
                "step": "group_matches",
                "message": f"Skupinski del: {len(group_specs)} tekem",
                "results": results,
            }
        )

        # Knockout
        knockout_specs = [
            # QF
            (qf_phase, "Ekipa Epsilon", "Ekipa Zeta", 16, 0, [("Blaz Lesjak", 1), ("Denis Vidmar", 1)], [("Nejc Bizjak", 2), ("Nejc Zajc", 1)], None, None, None, ""),
            (qf_phase, "Ekipa Alfa", "Ekipa Kappa", 16, 30, [("Blaz Potocnik", 2)], [("Simon Zajc", 2), ("Lan Hribar", 1), ("Luka Vidmar", 1)], None, None, None, ""),
            (qf_phase, "Ekipa Gama", "Ekipa Mu", 17, 0, [], [("Gal Kovac", 3), ("Anze Kolar", 1)], [("David Erjavec", 1)], None, None, ""),
            (qf_phase, "Ekipa Delta", "Ekipa Lambda", 17, 30, [("Rok Zajc", 1)], [("Mark Vodopivec", 1)], None, None, (2, 1), ""),
            # SF
            (sf_phase, "Ekipa Mu", "Ekipa Zeta", 18, 0, [], [("Nejc Zajc", 2), ("Nejc Bizjak", 1), ("Nejc Golob", 1), ("Lan Kos", 1)], None, None, None, ""),
            (sf_phase, "Ekipa Delta", "Ekipa Kappa", 18, 30, [("Rok Zajc", 1), ("Erik Pavlic", 1)], [("Mark Jereb", 1), ("Simon Zajc", 1)], None, None, (2, 1), ""),
            # 3rd
            (third_phase, "Ekipa Kappa", "Ekipa Mu", 19, 0, [], [], None, None, (5, 6), "Odločitev po penalih (strelci niso navedeni)."),
            # Final
            (final_phase, "Ekipa Delta", "Ekipa Zeta", 19, 30, [("Rok Zajc", 2), ("Gal Hribar", 1), ("Erik Pavlic", 1), ("Vid Oblak", 1)], [("Simon Pavlic", 1)], None, None, None, ""),
        ]

        ko_results = []
        for (
            phase,
            home_n,
            away_n,
            hh,
            mm,
            hs,
            aws,
            home_og,
            away_og,
            pens,
            notes,
        ) in knockout_specs:
            m = Local2009DemoGenerator._make_match(
                phase=phase,
                group=None,
                home=parts[home_n],
                away=parts[away_n],
                kickoff=_at(hh, mm),
                match_number=n,
            )
            n += 1
            # For Ekipa Gama own goal: home_own_goals means goals credited to home via OG by away player
            ko_results.append(
                Local2009DemoGenerator._play_match(
                    match=m,
                    home_scorers=hs,
                    away_scorers=aws,
                    home_own_goals=home_og,
                    away_own_goals=away_og,
                    pens=pens,
                    notes=notes,
                    goal_type=goal_type,
                    own_goal_type=own_goal_type,
                    user=user,
                )
            )
        steps.append(
            {
                "step": "knockout",
                "message": f"Izpadanje: {len(knockout_specs)} tekem (ČF–finale)",
                "results": ko_results,
            }
        )

        # Finish + awards
        top_scorer = Award.objects.filter(code="top_scorer").first()
        if top_scorer is None:
            top_scorer = EditionFinishService.ensure_award(
                name="Najboljši strelec", code="top_scorer"
            )

        def pid(team_name: str, player_name: str) -> int:
            pmap = Local2009DemoGenerator._player_map(parts[team_name])
            pl = Local2009DemoGenerator._lookup_player(pmap, player_name)
            if pl is None:
                raise ValidationError({"awards": f"Ni igralca {player_name}"})
            return pl.id

        standings = [
            {
                "position": 1,
                "team_participation_id": parts["Ekipa Delta"].id,
                "qualification": "1. mesto — pokal + bon paintball",
            },
            {
                "position": 2,
                "team_participation_id": parts["Ekipa Zeta"].id,
                "qualification": "2. mesto — pokal + bon pice",
            },
            {
                "position": 3,
                "team_participation_id": parts["Ekipa Mu"].id,
                "qualification": "3. mesto — pokal + plato piva",
            },
            {
                "position": 4,
                "team_participation_id": parts["Ekipa Kappa"].id,
                "qualification": "4. mesto — pokal + plato piva",
            },
        ]

        player_awards = [
            {
                "award_id": top_scorer.id,
                "player_id": pid("Ekipa Alfa", "Blaz Potocnik"),
                "team_participation_id": parts["Ekipa Alfa"].id,
                "notes": "1. mesto strelci — 8 golov",
            },
            {
                "award_id": top_scorer.id,
                "player_id": pid("Ekipa Zeta", "Nejc Zajc"),
                "team_participation_id": parts["Ekipa Zeta"].id,
                "notes": "2. mesto strelci — 6 golov",
            },
            {
                "award_id": top_scorer.id,
                "player_id": pid("Ekipa Mu", "Gal Kovac"),
                "team_participation_id": parts["Ekipa Mu"].id,
                "notes": "2. mesto strelci — 6 golov",
            },
            {
                "award_id": top_scorer.id,
                "player_id": pid("Ekipa Delta", "Rok Zajc"),
                "team_participation_id": parts["Ekipa Delta"].id,
                "notes": "4. mesto strelci — 5 golov",
            },
        ]

        EditionFinishService.finish(
            edition=edition,
            standings=standings,
            player_awards=player_awards,
            prizes=[
                {
                    "prize_type": "trophy",
                    "recipient_type": "team",
                    "team_participation_id": parts["Ekipa Delta"].id,
                    "description": "1. mesto — pokal + bon za paintball",
                },
                {
                    "prize_type": "trophy",
                    "recipient_type": "team",
                    "team_participation_id": parts["Ekipa Zeta"].id,
                    "description": "2. mesto — pokal + bon za pice",
                },
                {
                    "prize_type": "trophy",
                    "recipient_type": "team",
                    "team_participation_id": parts["Ekipa Mu"].id,
                    "description": "3. mesto — pokal + plato piva",
                },
                {
                    "prize_type": "trophy",
                    "recipient_type": "team",
                    "team_participation_id": parts["Ekipa Kappa"].id,
                    "description": "4. mesto — pokal + plato piva",
                },
            ],
        )
        edition.refresh_from_db()
        steps.append(
            {
                "step": "finish",
                "message": "Edicija zaključena · 1. Ekipa Delta · 2. Ekipa Zeta · 3. Ekipa Mu",
            }
        )

        final = (
            Match.objects.filter(
                tournament_phase=final_phase,
            )
            .order_by("id")
            .first()
        )
        final_score = (
            f"{final.home_score}:{final.away_score}" if final else "5:1"
        )

        return {
            "tournament_id": tournament.id,
            "edition_id": edition.id,
            "tournament_name": tournament.name,
            "edition_name": edition.name,
            "champion": "Ekipa Delta",
            "final_score": final_score,
            "location": "Demo lokacija",
            "date": "2009-08-22",
            "system": "4+1",
            "steps": steps,
            "links": {
                "tournament": f"/dashboard_admin/tournaments/{tournament.id}",
                "edition": f"/editions/{edition.id}",
                "matches": f"/editions/{edition.id}/matches",
                "standings": f"/editions/{edition.id}/standings",
                "stats": f"/editions/{edition.id}/statistika",
                "players": f"/editions/{edition.id}/players",
            },
        }
