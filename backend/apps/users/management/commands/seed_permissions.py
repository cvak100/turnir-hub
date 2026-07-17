from django.core.management.base import BaseCommand

from apps.users.models import Permission, Role, RolePermission

PERMISSIONS = [
    ("tournament.view", "View tournaments"),
    ("tournament.create", "Create tournaments"),
    ("tournament.edit", "Edit tournaments"),
    ("tournament.delete", "Delete tournaments"),
    ("edition.view", "View editions"),
    ("edition.create", "Create editions"),
    ("edition.edit", "Edit editions"),
    ("edition.manage", "Manage editions"),
    ("edition.delete", "Delete editions"),
    ("match.view", "View matches"),
    ("match.edit", "Edit matches"),
    ("match.manage", "Manage matches (preparation)"),
    ("match.live.manage", "Manage live match state"),
    ("match.result.edit", "Edit match results"),
    ("match.event.add", "Add match events"),
    ("match.event.edit", "Edit match events"),
    ("match.event.delete", "Delete match events"),
    ("match.finish", "Finish matches"),
    ("team.view", "View teams"),
    ("team.manage", "Manage teams"),
    ("team.participation.manage", "Register teams into editions"),
    ("player.view", "View players"),
    ("player.manage", "Manage players"),
    ("player.assign", "Assign players to team participations"),
    ("phase.manage", "Manage phases and groups"),
    ("admin.full_access", "Full admin access"),
]

ROLE_PERMISSIONS = {
    "super_admin": [code for code, _ in PERMISSIONS],
    "tournament_admin": [
        "tournament.view",
        "tournament.create",
        "tournament.edit",
        "edition.view",
        "edition.create",
        "edition.edit",
        "edition.manage",
        "edition.delete",
        "match.view",
        "match.edit",
        "match.manage",
        "match.live.manage",
        "match.result.edit",
        "match.event.add",
        "match.event.edit",
        "match.event.delete",
        "match.finish",
        "team.view",
        "team.manage",
        "team.participation.manage",
        "player.view",
        "player.manage",
        "player.assign",
        "phase.manage",
    ],
    "editor": [
        "edition.view",
        "match.view",
        "match.edit",
        "match.manage",
        "match.live.manage",
        "match.result.edit",
        "match.event.add",
        "match.event.edit",
        "match.event.delete",
        "match.finish",
        "team.view",
        "player.view",
        "phase.manage",
    ],
    "team_manager": [
        "edition.view",
        "team.view",
        "team.manage",
        "team.participation.manage",
        "player.view",
        "player.manage",
        "player.assign",
        "match.view",
    ],
    "viewer": [
        "tournament.view",
        "edition.view",
        "match.view",
        "team.view",
        "player.view",
    ],
}

ROLES = [
    ("Super Admin", "super_admin", "Full access to everything"),
    ("Tournament Admin", "tournament_admin", "Full control inside assigned editions"),
    ("Editor", "editor", "Edit matches, results and events"),
    ("Team Manager", "team_manager", "Manage team and players"),
    ("Viewer", "viewer", "Read-only access"),
]


class Command(BaseCommand):
    help = "Seed initial Permission and Role data for Phase 4/5"

    def handle(self, *args, **options):
        permission_map = {}
        for code, name in PERMISSIONS:
            perm, created = Permission.objects.get_or_create(
                code=code,
                defaults={"name": name, "description": name},
            )
            permission_map[code] = perm
            action = "Created" if created else "Exists"
            self.stdout.write(f"{action} permission: {code}")

        for name, slug, description in ROLES:
            role, created = Role.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "description": description,
                    "is_active": True,
                },
            )
            action = "Created" if created else "Exists"
            self.stdout.write(f"{action} role: {slug}")

            for code in ROLE_PERMISSIONS[slug]:
                RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission_map[code],
                )

        self.stdout.write(self.style.SUCCESS("Permission seed completed."))
