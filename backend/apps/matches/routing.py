from django.urls import re_path

from apps.matches.consumers import MatchConsumer

websocket_urlpatterns = [
    re_path(r"ws/matches/(?P<match_id>\d+)/$", MatchConsumer.as_asgi()),
]
