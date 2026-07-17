from django.contrib import admin

from .models import (
    Award,
    Player,
    PlayerAward,
    PlayerStatus,
    Team,
    TeamParticipation,
    TeamParticipationPlayer,
    TeamStatus,
)


class StatusAdminMixin:
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(TeamStatus)
class TeamStatusAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "status", "short_name")
    list_filter = ("status",)
    search_fields = ("name", "short_name", "city")
    filter_horizontal = ("sponsors",)


@admin.register(TeamParticipation)
class TeamParticipationAdmin(admin.ModelAdmin):
    list_display = (
        "participation_name",
        "tournament_edition",
        "status",
        "payment_status",
    )
    list_filter = ("status", "payment_status", "tournament_edition")
    search_fields = ("participation_name",)
    filter_horizontal = ("sponsors",)


@admin.register(PlayerStatus)
class PlayerStatusAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = (
        "person",
        "position",
        "preferred_jersey_number",
        "status",
        "is_active",
    )
    list_filter = ("status", "is_active", "position")
    search_fields = (
        "person__first_name",
        "person__last_name",
        "nationality",
    )


@admin.register(TeamParticipationPlayer)
class TeamParticipationPlayerAdmin(admin.ModelAdmin):
    list_display = (
        "team_participation",
        "player",
        "jersey_number",
        "is_captain",
        "goals",
        "status",
        "is_active",
    )
    list_filter = ("status", "is_active", "is_captain")
    search_fields = (
        "player__person__first_name",
        "player__person__last_name",
    )


@admin.register(Award)
class AwardAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")


@admin.register(PlayerAward)
class PlayerAwardAdmin(admin.ModelAdmin):
    list_display = (
        "player",
        "award",
        "tournament_edition",
        "team_participation",
    )
    list_filter = ("award", "tournament_edition")
    search_fields = (
        "player__person__first_name",
        "player__person__last_name",
    )
