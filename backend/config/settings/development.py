"""
Development settings for turnir-hub.
"""

import socket

from .base import *  # noqa: F403

DEBUG = True

CORS_ALLOW_CREDENTIALS = True
# LAN dev: phone/tablet/other PC on http://192.168.x.x:3000
CORS_ALLOW_ALL_ORIGINS = True

try:
    _, _, _local_ips = socket.gethostbyname_ex(socket.gethostname())
    ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *_local_ips]))
except OSError:
    pass
