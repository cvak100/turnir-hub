from django.contrib import admin

from .models import EventType, Match, MatchEvent, MatchStatus


class StatusAdminMixin:
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(MatchStatus)
class MatchStatusAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "match_number",
        "tournament_phase",
        "home_team_participation",
        "away_team_participation",
        "match_date",
        "status",
        "home_score",
        "away_score",
    )
    list_filter = ("status", "tournament_phase", "is_walkover")
    search_fields = (
        "home_team_participation__participation_name",
        "away_team_participation__participation_name",
    )


@admin.register(EventType)
class EventTypeAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "icon", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(MatchEvent)
class MatchEventAdmin(admin.ModelAdmin):
    list_display = (
        "match",
        "event_type",
        "minute",
        "extra_minute",
        "half",
        "player",
        "team_participation",
    )
    list_filter = ("event_type", "half", "is_penalty", "is_own_goal")
    search_fields = (
        "player__person__first_name",
        "player__person__last_name",
        "description",
    )
