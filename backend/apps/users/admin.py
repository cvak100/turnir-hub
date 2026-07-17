from django.contrib import admin

from .models import (
    Country,
    Permission,
    Person,
    PersonRole,
    PersonRoleType,
    PersonStatus,
    Role,
    RolePermission,
    UserRole,
)


class StatusAdminMixin:
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Country)
class CountryAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "iso2", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code", "iso2")
    ordering = ("order", "name")


@admin.register(PersonStatus)
class PersonStatusAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "color", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order", "name")


@admin.register(PersonRoleType)
class PersonRoleTypeAdmin(StatusAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("order", "name")


@admin.register(PersonRole)
class PersonRoleAdmin(admin.ModelAdmin):
    list_display = ("person", "role_type", "created_at")
    list_filter = ("role_type",)
    search_fields = (
        "person__first_name",
        "person__last_name",
        "role_type__code",
    )


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "email",
        "status",
        "show_as_anonymous",
    )
    list_filter = ("status", "show_as_anonymous", "person_roles__role_type")
    search_fields = ("first_name", "last_name", "email", "nickname")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "tournament_edition", "created_at")
    list_filter = ("role", "tournament_edition")
    search_fields = ("user__username", "role__name")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission", "created_at")
    list_filter = ("role",)
    search_fields = ("role__name", "permission__code")
