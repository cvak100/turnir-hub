"""
Load settings module based on DJANGO_ENV.
"""

import os

from dotenv import load_dotenv

load_dotenv()

env = os.getenv("DJANGO_ENV", "development").lower()

if env == "production":
    from .production import *  # noqa: F403
else:
    from .development import *  # noqa: F403
