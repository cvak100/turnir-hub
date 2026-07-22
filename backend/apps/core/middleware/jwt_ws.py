"""Authenticate Channels WebSocket connections via JWT access token.

Browsers cannot set custom Authorization headers on WebSocket handshakes, so
clients pass the SimpleJWT access token as `?token=...`. An `Authorization:
Bearer ...` header is also accepted (useful for non-browser clients).

Invalid or missing tokens resolve to AnonymousUser — visibility is enforced
in the consumer (public editions remain watchable without login).
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _user_from_access_token(raw_token: str):
    User = get_user_model()
    try:
        access = AccessToken(raw_token)
        user_id = access.get("user_id")
        if user_id is None:
            return AnonymousUser()
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


def _token_from_scope(scope) -> str | None:
    query_string = scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    token_list = params.get("token") or []
    if token_list and token_list[0]:
        return token_list[0]

    headers = dict(scope.get("headers") or [])
    auth = headers.get(b"authorization", b"").decode()
    if auth.lower().startswith("bearer "):
        value = auth[7:].strip()
        return value or None
    return None


class JwtAuthMiddleware(BaseMiddleware):
    """Override scope['user'] when a JWT is present; otherwise keep session user."""

    async def __call__(self, scope, receive, send):
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)

        scope = dict(scope)
        token = _token_from_scope(scope)
        if token:
            scope["user"] = await _user_from_access_token(token)
        elif "user" not in scope:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """Session auth first, then JWT overrides when `token` / Bearer is provided."""
    from channels.auth import AuthMiddlewareStack

    return AuthMiddlewareStack(JwtAuthMiddleware(inner))
