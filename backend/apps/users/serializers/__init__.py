from .person import PersonMinimalSerializer
from .person_full import (
    PersonCreateUpdateSerializer,
    PersonDetailSerializer,
    PersonListSerializer,
    PersonStatusSerializer,
)

__all__ = [
    "PersonMinimalSerializer",
    "PersonStatusSerializer",
    "PersonListSerializer",
    "PersonDetailSerializer",
    "PersonCreateUpdateSerializer",
]
