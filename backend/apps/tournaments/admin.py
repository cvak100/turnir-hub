from django.contrib import admin

from .models import (
    GlobalRuleTemplate,
    Sponsor,
    Sport,
    Template,
    Tournament,
    TournamentCategory,
    TournamentEdition,
    TournamentFinalStanding,
    TournamentFormat,
    TournamentFormatConfig,
    TournamentPhase,
    TournamentPhaseGroup,
    TournamentPhaseGroupTeam,
    TournamentPrize,
    TournamentStatus,
)


class StatusAdminMixin:
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Sponsor)
class SponsorAdmin(admin.ModelAdmin):
    list_display = ("name", "website", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(TournamentStatus)
class TournamentStatusAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(TournamentFormat)
class TournamentFormatAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order",)


@admin.register(GlobalRuleTemplate)
class GlobalRuleTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "players_per_team",
        "match_duration_minutes",
        "field_type",
        "points_for_win",
        "is_system",
        "is_active",
    )
    list_filter = ("is_active", "is_system", "field_type", "allow_extra_time")
    search_fields = ("name", "description")


@admin.register(TournamentCategory)
class TournamentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("order", "name")


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "template_type", "order", "is_active")
    list_filter = ("template_type", "is_active")
    search_fields = ("name", "code")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("name", "sport", "contact_person", "is_active")
    list_filter = ("sport", "is_active")
    search_fields = ("name",)
    filter_horizontal = ("sponsors",)


@admin.register(TournamentEdition)
class TournamentEditionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "tournament",
        "year",
        "status",
        "format",
        "start_date",
        "end_date",
        "is_public",
    )
    list_filter = ("status", "format", "year", "is_public", "tournament")
    search_fields = ("name", "location")
    filter_horizontal = ("sponsors",)


@admin.register(TournamentFormatConfig)
class TournamentFormatConfigAdmin(admin.ModelAdmin):
    list_display = (
        "tournament_edition",
        "number_of_groups",
        "teams_per_group",
        "teams_advancing_per_group",
        "pairing_method",
        "has_third_place_match",
    )
    list_filter = ("pairing_method", "best_runners_up", "has_third_place_match")
    search_fields = ("tournament_edition__name",)


@admin.register(TournamentPhase)
class TournamentPhaseAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "tournament_edition",
        "phase_type",
        "order",
        "status",
        "is_active",
    )
    list_filter = ("phase_type", "status", "is_active", "tournament_edition")
    search_fields = ("name",)


@admin.register(TournamentPhaseGroup)
class TournamentPhaseGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament_phase", "order", "max_teams")
    list_filter = ("tournament_phase",)
    search_fields = ("name",)


@admin.register(TournamentPhaseGroupTeam)
class TournamentPhaseGroupTeamAdmin(admin.ModelAdmin):
    list_display = (
        "tournament_phase_group",
        "team_participation",
        "points",
        "played",
        "wins",
        "draws",
        "losses",
    )
    list_filter = ("tournament_phase_group",)


@admin.register(TournamentFinalStanding)
class TournamentFinalStandingAdmin(admin.ModelAdmin):
    list_display = (
        "tournament_edition",
        "position",
        "team_participation",
        "points",
        "goal_difference",
    )
    list_filter = ("tournament_edition",)
    ordering = ("position",)


@admin.register(TournamentPrize)
class TournamentPrizeAdmin(admin.ModelAdmin):
    list_display = (
        "tournament_edition",
        "prize_type",
        "recipient_type",
        "value",
        "sponsor",
    )
    list_filter = ("prize_type", "recipient_type", "tournament_edition")
    search_fields = ("description",)
