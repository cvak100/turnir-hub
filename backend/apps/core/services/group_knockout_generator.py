from __future__ import annotations

import random
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.core.services.demo_generator import DemoTournamentGenerator
from apps.matches.services.match import MatchService
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
from apps.tournaments.services.format_generation import (
    MatchGenerationService,
    TournamentFormatConfigService,
)
from apps.tournaments.services.group import TournamentPhaseGroupTeamService
from apps.tournaments.services.tournament import TournamentService
from apps.users.models import PersonRoleType
from apps.users.services.person import PersonService


TEAM_NAMES = [
    "Alfa",
    "Beta",
    "Gama",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Jota",
    "Kapa",
    "Lambda",
    "Mi",
]

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
    "Erik",
    "Bor",
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
    "Bizjak",
    "Hribar",
]


class GroupKnockoutGenerator:
    """
    Generator AA: Trojke group + knockout demo.
    12 teams → 4 groups of 3 → group winners to semifinals.
    Plays all matches but does NOT finish the edition.
    """

    PLAYERS_PER_TEAM = 5
    NUM_TEAMS = 12
    NUM_GROUPS = 4
    TEAMS_PER_GROUP = 3
    ADVANCING_PER_GROUP = 1

    @staticmethod
    def _require(obj, label: str):
        return DemoTournamentGenerator._require(obj, label)

    @staticmethod
    def _phase_by_round(edition, round_code: str):
        return DemoTournamentGenerator._phase_by_round(edition, round_code)

    @staticmethod
    @transaction.atomic
    def run(*, user=None, seed: int | None = None) -> dict:
        rng = random.Random(seed if seed is not None else timezone.now().timestamp())
        stamp = timezone.now().strftime("%m%d-%H%M")
        steps: list[dict] = []

        sport = Sport.objects.filter(is_active=True).order_by("id").first()
        if sport is None:
            sport = Sport.objects.create(name="Nogomet", is_active=True)
        steps.append({"step": "sport", "message": f"Sport: {sport.name}"})

        fmt = GroupKnockoutGenerator._require(
            TournamentFormat.objects.filter(code="group_knockout").first(),
            "format 'group_knockout'",
        )
        category = GroupKnockoutGenerator._require(
            TournamentCategory.objects.filter(slug="trojke").first()
            or TournamentCategory.objects.filter(name__icontains="Trojke").first(),
            "kategorija Trojke",
        )
        rules = GroupKnockoutGenerator._require(
            GlobalRuleTemplate.objects.filter(name__icontains="Trojke 3v3").first()
            or GlobalRuleTemplate.objects.filter(name__icontains="Trojke").first(),
            "pravila Trojke 3v3",
        )
        status_ongoing = GroupKnockoutGenerator._require(
            TournamentStatus.objects.filter(code="ongoing").first(),
            "status ongoing",
        )
        player_role = GroupKnockoutGenerator._require(
            PersonRoleType.objects.filter(code="player").first(),
            "vloga player",
        )

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

        tournament = TournamentService.create_tournament(
            data={
                "name": f"Demo Skupine+KO {stamp}",
                "sport": sport,
                "description": (
                    "Generator AA: 12 ekip, 4 skupine po 3, "
                    "zmagovalci v polfinale. Edicija ostane ongoing."
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

        today = date.today()
        edition = TournamentEditionService.create_edition(
            data={
                "tournament": tournament,
                "name": f"Edicija {today.year} Skupine+KO",
                "year": today.year,
                "start_date": today,
                "end_date": today + timedelta(days=3),
                "status": status_ongoing,
                "format": fmt,
                "category": category,
                "global_rule_template": rules,
                "max_teams": GroupKnockoutGenerator.NUM_TEAMS,
                "max_players_per_team": GroupKnockoutGenerator.PLAYERS_PER_TEAM,
                "location": "Demo arena (skupine)",
                "is_public": True,
                "apply_format_phases": False,
            },
            user=user,
        )
        steps.append(
            {
                "step": "edition",
                "message": f"Edicija #{edition.id} (status ongoing)",
                "id": edition.id,
            }
        )

        TournamentFormatConfigService.update_config(
            edition=edition,
            data={
                "number_of_groups": GroupKnockoutGenerator.NUM_GROUPS,
                "teams_per_group": GroupKnockoutGenerator.TEAMS_PER_GROUP,
                "teams_advancing_per_group": GroupKnockoutGenerator.ADVANCING_PER_GROUP,
                "best_runners_up": False,
                "number_of_best_runners_up": None,
                "has_third_place_match": True,
                "pairing_method": "auto_cross",
            },
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

        group_phase = (
            edition.phases.filter(phase_type="group_stage")
            .order_by("order", "id")
            .first()
        )
        GroupKnockoutGenerator._require(group_phase, "skupinsko fazo")
        groups = list(group_phase.groups.order_by("order", "id"))
        if len(groups) != GroupKnockoutGenerator.NUM_GROUPS:
            raise ValidationError(
                {
                    "groups": (
                        f"Expected {GroupKnockoutGenerator.NUM_GROUPS} groups, "
                        f"got {len(groups)}."
                    )
                }
            )

        participations = []
        for idx, team_name in enumerate(TEAM_NAMES):
            team = TeamService.create_team(
                data={
                    "name": f"{team_name} Trojke",
                    "short_name": f"G{idx + 1}",
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

            for j in range(GroupKnockoutGenerator.PLAYERS_PER_TEAM):
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
                TeamParticipationPlayerService.create_participation_player(
                    data={
                        "team_participation": part,
                        "player": person.player,
                        "jersey_number": j + 1,
                        "position": ["GK", "DF", "MF", "FW", "FW"][j],
                        "is_captain": j == 0,
                        "is_active": True,
                    }
                )

        steps.append(
            {
                "step": "teams_players",
                "message": (
                    f"{GroupKnockoutGenerator.NUM_TEAMS} ekip × "
                    f"{GroupKnockoutGenerator.PLAYERS_PER_TEAM} igralcev"
                ),
                "teams": [p.participation_name for p in participations],
            }
        )

        # Assign 3 teams per group (A–D)
        for i, part in enumerate(participations):
            group = groups[i // GroupKnockoutGenerator.TEAMS_PER_GROUP]
            TournamentPhaseGroupTeamService.create_group_team(
                data={
                    "tournament_phase_group": group,
                    "team_participation": part,
                    "order": (i % GroupKnockoutGenerator.TEAMS_PER_GROUP) + 1,
                }
            )
        steps.append(
            {
                "step": "group_assign",
                "message": (
                    "Skupine: "
                    + ", ".join(
                        f"{g.name} ({GroupKnockoutGenerator.TEAMS_PER_GROUP})"
                        for g in groups
                    )
                ),
            }
        )

        group_matches = MatchGenerationService.generate_group_round_robin(
            phase=group_phase,
            replace=True,
        )
        steps.append(
            {
                "step": "group_matches_created",
                "message": f"Skupinske tekme: {len(group_matches)}",
                "count": len(group_matches),
            }
        )

        group_results = []
        for match in group_matches:
            match.refresh_from_db()
            group_results.append(
                DemoTournamentGenerator._simulate_match(
                    match=match, rng=rng, user=user
                )
            )
        steps.append(
            {
                "step": "group_matches_played",
                "message": "Skupinski del odigran",
                "results": group_results,
            }
        )

        ko_matches = MatchGenerationService.fill_knockout(
            edition=edition,
            replace=True,
            force=False,
        )
        steps.append(
            {
                "step": "knockout_fill",
                "message": f"Polfinale napolnjeno ({len(ko_matches)} tekem)",
                "count": len(ko_matches),
            }
        )

        edition.refresh_from_db()
        sf_phase = GroupKnockoutGenerator._phase_by_round(edition, "semifinal")
        third_phase = GroupKnockoutGenerator._phase_by_round(edition, "third_place")
        final_phase = GroupKnockoutGenerator._phase_by_round(edition, "final")
        GroupKnockoutGenerator._require(sf_phase, "fazo Polfinale")
        GroupKnockoutGenerator._require(third_phase, "fazo Za 3. mesto")
        GroupKnockoutGenerator._require(final_phase, "fazo Finale")

        sf_matches = list(sf_phase.matches.order_by("match_number", "id"))
        if len(sf_matches) < 2:
            raise ValidationError({"phases": "Polfinale nima 2 tekem."})

        sf_results = []
        for match in sf_matches:
            match.refresh_from_db()
            if (
                not match.home_team_participation_id
                or not match.away_team_participation_id
            ):
                raise ValidationError(
                    {"match": f"SF match #{match.id} nima obeh ekip."}
                )
            sf_results.append(
                DemoTournamentGenerator._simulate_match(
                    match=match, rng=rng, user=user
                )
            )
        steps.append(
            {
                "step": "semifinals_play",
                "message": "Polfinale odigrano",
                "results": sf_results,
            }
        )

        for match in sf_matches:
            match.refresh_from_db()
        w1, l1 = DemoTournamentGenerator._match_winner_loser(sf_matches[0])
        w2, l2 = DemoTournamentGenerator._match_winner_loser(sf_matches[1])

        for phase in (third_phase, final_phase):
            MatchService.generate_placeholder_matches(phase=phase, replace=True)

        final_match = final_phase.matches.order_by("match_number", "id").first()
        third_match = third_phase.matches.order_by("match_number", "id").first()
        GroupKnockoutGenerator._require(final_match, "finale tekmo")
        GroupKnockoutGenerator._require(third_match, "tekmo za 3. mesto")

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
                "message": "Finale in 3. mesto odigrano (edicija NI zaključena)",
                "results": [third_result, final_result],
            }
        )

        # Intentionally leave edition.status = ongoing
        edition.refresh_from_db()
        final_match.refresh_from_db()
        champion, _ = DemoTournamentGenerator._match_winner_loser(final_match)

        steps.append(
            {
                "step": "open_for_finish",
                "message": (
                    f"Status edicije: {edition.status.code}. "
                    "Pripravljeno za /finish (zaključek ročno)."
                ),
            }
        )

        return {
            "tournament_id": tournament.id,
            "edition_id": edition.id,
            "tournament_name": tournament.name,
            "champion": champion.participation_name if champion else None,
            "final_score": f"{final_match.home_score}:{final_match.away_score}",
            "edition_status": edition.status.code if edition.status_id else None,
            "groups": GroupKnockoutGenerator.NUM_GROUPS,
            "teams": GroupKnockoutGenerator.NUM_TEAMS,
            "steps": steps,
            "links": {
                "tournament": f"/dashboard_admin/tournaments/{tournament.id}",
                "edition": f"/editions/{edition.id}",
                "matches": f"/editions/{edition.id}/matches",
                "players": f"/editions/{edition.id}/players",
                "finish": f"/editions/{edition.id}/finish",
                "phases": f"/editions/{edition.id}/phases",
            },
        }
