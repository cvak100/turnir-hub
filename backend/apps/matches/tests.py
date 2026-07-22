from datetime import date
import json

from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.middleware.jwt_ws import JwtAuthMiddlewareStack
from apps.matches.consumers import WS_CLOSE_FORBIDDEN, WS_CLOSE_NOT_FOUND
from apps.matches.models import Match, MatchStatus
from apps.matches.routing import websocket_urlpatterns
from apps.tournaments.models import (
    Sport,
    Tournament,
    TournamentEdition,
    TournamentPhase,
    TournamentStatus,
)
from apps.users.models import Role, UserRole

User = get_user_model()

# Bypass AllowedHostsOriginValidator — same auth stack as production ASGI.
TEST_WS_APPLICATION = JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))


class MatchConsumerAuthTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ws_user", password="pass")
        self.other = User.objects.create_user(username="ws_other", password="pass")
        self.sport = Sport.objects.create(name="Football")
        self.t_status = TournamentStatus.objects.create(
            name="Active", code="active", order=1
        )
        self.m_status = MatchStatus.objects.create(
            name="Live", code="match_live", order=1
        )
        self.tournament = Tournament.objects.create(
            name="Cup", sport=self.sport
        )
        self.public_edition = TournamentEdition.objects.create(
            tournament=self.tournament,
            name="Public 2026",
            year=2026,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=self.t_status,
            is_public=True,
            created_by=self.user,
        )
        self.private_edition = TournamentEdition.objects.create(
            tournament=self.tournament,
            name="Private 2026",
            year=2026,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status=self.t_status,
            is_public=False,
            created_by=self.user,
        )
        self.public_phase = TournamentPhase.objects.create(
            tournament_edition=self.public_edition,
            name="Group A",
            phase_type=TournamentPhase.PhaseType.GROUP_STAGE,
            order=1,
        )
        self.private_phase = TournamentPhase.objects.create(
            tournament_edition=self.private_edition,
            name="Group A",
            phase_type=TournamentPhase.PhaseType.GROUP_STAGE,
            order=1,
        )
        self.public_match = Match.objects.create(
            tournament_phase=self.public_phase,
            status=self.m_status,
        )
        self.private_match = Match.objects.create(
            tournament_phase=self.private_phase,
            status=self.m_status,
        )
        self.role = Role.objects.create(name="Organizer", slug="organizer")

    def _connect(self, path: str):
        async def _run():
            communicator = WebsocketCommunicator(TEST_WS_APPLICATION, path)
            connected, _ = await communicator.connect()
            established = None
            close_code = None
            if not connected:
                return connected, established, close_code

            for _ in range(3):
                try:
                    event = await communicator.receive_output(timeout=1)
                except Exception:
                    break
                if event.get("type") == "websocket.send":
                    established = json.loads(event["text"])
                    break
                if event.get("type") == "websocket.close":
                    close_code = event.get("code")
                    break

            await communicator.disconnect()
            return connected, established, close_code

        return async_to_sync(_run)()

    def test_anon_can_subscribe_to_public_match(self):
        connected, established, _ = self._connect(
            f"/ws/matches/{self.public_match.id}/"
        )
        self.assertTrue(connected)
        self.assertEqual(established["type"], "connection.established")
        self.assertEqual(established["match_id"], self.public_match.id)

    def test_anon_cannot_subscribe_to_private_match(self):
        connected, established, close_code = self._connect(
            f"/ws/matches/{self.private_match.id}/"
        )
        self.assertTrue(connected)
        self.assertIsNone(established)
        self.assertEqual(close_code, WS_CLOSE_FORBIDDEN)

    def test_missing_match_returns_not_found(self):
        connected, established, close_code = self._connect("/ws/matches/999999/")
        self.assertTrue(connected)
        self.assertIsNone(established)
        self.assertEqual(close_code, WS_CLOSE_NOT_FOUND)

    def test_scoped_user_can_subscribe_to_private_match_with_jwt(self):
        UserRole.objects.create(
            user=self.user,
            role=self.role,
            tournament_edition=self.private_edition,
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        connected, established, _ = self._connect(
            f"/ws/matches/{self.private_match.id}/?token={token}"
        )
        self.assertTrue(connected)
        self.assertEqual(established["type"], "connection.established")

    def test_user_without_role_cannot_subscribe_to_private_match(self):
        token = str(RefreshToken.for_user(self.other).access_token)
        connected, established, close_code = self._connect(
            f"/ws/matches/{self.private_match.id}/?token={token}"
        )
        self.assertTrue(connected)
        self.assertIsNone(established)
        self.assertEqual(close_code, WS_CLOSE_FORBIDDEN)

    def test_invalid_token_treated_as_anon_on_private_match(self):
        connected, established, close_code = self._connect(
            f"/ws/matches/{self.private_match.id}/?token=not-a-jwt"
        )
        self.assertTrue(connected)
        self.assertIsNone(established)
        self.assertEqual(close_code, WS_CLOSE_FORBIDDEN)
