from apps.matches.models import MatchStatus

# Same codes as tournaments/app/models/status.py (+ match_first_half used in templates)
STATUSES = {
    # … other models unchanged below — only MatchStatus replaced in seed file
}

MATCH_STATUS_ROWS = [
    # (name, code, color, order)
    ("Načrtovana", "match_scheduled", "#3b82f6", 1),
    ("Ni začeta", "match_not_started", "#60a5fa", 2),
    ("Ogrevanje", "match_warmup", "#f97316", 3),
    ("V teku", "match_in_progress", "#ef4444", 4),
    ("1. polčas", "match_first_half", "#ef4444", 5),
    ("Polčas", "match_halftime", "#f59e0b", 6),
    ("2. polčas", "match_second_half", "#ef4444", 7),
    ("Podaljški", "match_extra_time", "#a855f7", 8),
    ("Kazenski streli", "match_penalties", "#eab308", 9),
    ("Konec tekme", "match_finished", "#64748b", 10),
    ("Prekinjeno", "match_abandoned", "#94a3b8", 11),
    # Legacy codes (compat with older FE/seeds)
    ("Scheduled", "scheduled", "#3b82f6", 20),
    ("Live", "live", "#ef4444", 21),
    ("Finished", "finished", "#64748b", 22),
    ("Postponed", "postponed", "#f59e0b", 23),
    ("Cancelled", "cancelled", "#94a3b8", 24),
]

# Live Edit / event entry allowed
LIVE_MATCH_STATUS_CODES = frozenset(
    {
        "live",
        "match_warmup",
        "match_in_progress",
        "match_first_half",
        "match_halftime",
        "match_second_half",
        "match_extra_time",
        "match_penalties",
    }
)

FINISHED_MATCH_STATUS_CODES = frozenset(
    {"finished", "match_finished", "match_abandoned"}
)

# Edition can be closed when every match is finished-like or cancelled.
COMPLETED_MATCH_STATUS_CODES = frozenset(
    {
        *FINISHED_MATCH_STATUS_CODES,
        "cancelled",
    }
)

SCHEDULED_MATCH_STATUS_CODES = frozenset(
    {"scheduled", "match_scheduled", "match_not_started", "postponed"}
)

# Quick buttons on Live page (same set as match_live.html + extra time)
LIVE_QUICK_STATUS_CODES = (
    "match_first_half",
    "match_halftime",
    "match_second_half",
    "match_extra_time",
    "match_penalties",
    "match_finished",
)


def is_live_match_status(code: str | None) -> bool:
    return bool(code) and code in LIVE_MATCH_STATUS_CODES


def is_finished_match_status(code: str | None) -> bool:
    return bool(code) and code in FINISHED_MATCH_STATUS_CODES


def is_completed_match_status(code: str | None) -> bool:
    return bool(code) and code in COMPLETED_MATCH_STATUS_CODES


def is_scheduled_match_status(code: str | None) -> bool:
    return bool(code) and code in SCHEDULED_MATCH_STATUS_CODES


def event_half_for_status(code: str | None) -> str:
    mapping = {
        "match_first_half": "1",
        "match_halftime": "1",
        "match_second_half": "2",
        "match_extra_time": "ET1",
        "match_penalties": "penalties",
        "match_in_progress": "1",
        "live": "1",
    }
    return mapping.get(code or "", "1")


def get_match_status(code: str) -> MatchStatus:
    status = MatchStatus.objects.filter(code=code).first()
    if status is None:
        from apps.core.exceptions import InvalidStateError

        raise InvalidStateError(f"MatchStatus '{code}' is not configured.")
    return status
