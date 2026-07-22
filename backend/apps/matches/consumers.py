from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from apps.matches.models import Match
from apps.matches.services.access import user_can_view_match

# Application-defined close codes (4xxx). Clients should not reconnect on these.
WS_CLOSE_FORBIDDEN = 4403
WS_CLOSE_NOT_FOUND = 4404


class MatchConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.match_id = self.scope["url_route"]["kwargs"]["match_id"]
        self.group_name = None

        match = await self._get_match(self.match_id)
        if match is None:
            await self.accept()
            await self.close(code=WS_CLOSE_NOT_FOUND)
            return

        user = self.scope.get("user") or AnonymousUser()
        if not await self._can_view(user, match):
            await self.accept()
            await self.close(code=WS_CLOSE_FORBIDDEN)
            return

        self.group_name = f"match.{self.match_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "connection.established",
                "match_id": int(self.match_id),
            }
        )

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def match_update(self, event):
        await self.send_json(event["payload"])

    @staticmethod
    @database_sync_to_async
    def _get_match(match_id):
        try:
            return Match.objects.select_related(
                "tournament_phase__tournament_edition",
            ).get(pk=match_id)
        except (Match.DoesNotExist, ValueError, TypeError):
            return None

    @staticmethod
    @database_sync_to_async
    def _can_view(user, match) -> bool:
        return user_can_view_match(user, match)
