from apps.users.models import RolePermission, UserRole
from apps.users.services.identity import get_person_for_user


class PermissionService:
    @staticmethod
    def user_has_permission(
        user,
        permission_code: str,
        tournament_edition=None,
    ) -> bool:
        """
        Returns True if the user has the given permission.

        Rules:
        - Superusers always return True
        - Global roles (tournament_edition is null) apply everywhere
        - Scoped roles apply only to the given tournament_edition
        """
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        edition_id = None
        if tournament_edition is not None:
            edition_id = getattr(tournament_edition, "id", tournament_edition)

        user_roles = UserRole.objects.filter(user=user).select_related("role")

        for user_role in user_roles:
            if user_role.tournament_edition_id is not None:
                if edition_id is None:
                    continue
                if user_role.tournament_edition_id != edition_id:
                    continue

            has_perm = RolePermission.objects.filter(
                role=user_role.role,
                permission__code=permission_code,
            ).exists()

            if has_perm:
                return True

        return False

    @staticmethod
    def user_has_permission_anywhere(user, permission_code: str) -> bool:
        """
        True if the user has the permission via any role (global or scoped).
        Used for list endpoints where edition context is not yet known.
        """
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        user_roles = UserRole.objects.filter(user=user).select_related("role")
        for user_role in user_roles:
            has_perm = RolePermission.objects.filter(
                role=user_role.role,
                permission__code=permission_code,
            ).exists()
            if has_perm:
                return True
        return False

    @staticmethod
    def get_user_permission_payload(user) -> dict:
        """Frontend Approach A: roles with permission codes + linked person."""
        if not user or not user.is_authenticated:
            return {"user": None}

        user_roles = (
            UserRole.objects.filter(user=user)
            .select_related("role")
            .prefetch_related("role__role_permissions__permission")
        )

        roles_payload = []
        for user_role in user_roles:
            permissions = [
                rp.permission.code
                for rp in user_role.role.role_permissions.all()
            ]
            roles_payload.append(
                {
                    "role": user_role.role.slug,
                    "tournament_edition_id": user_role.tournament_edition_id,
                    "permissions": permissions,
                }
            )

        person_payload = None
        person = get_person_for_user(user)
        if person is not None:
            person_payload = {
                "id": person.id,
                "first_name": person.first_name,
                "last_name": person.last_name,
                "nickname": person.nickname,
                "email": person.email,
            }

        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "is_superuser": user.is_superuser,
                "roles": roles_payload,
                "person": person_payload,
            }
        }

    @staticmethod
    def resolve_tournament_edition(obj):
        """Resolve TournamentEdition from common domain objects."""
        if obj is None:
            return None

        class_name = obj.__class__.__name__

        if class_name == "TournamentEdition":
            return obj

        if hasattr(obj, "tournament_edition"):
            return obj.tournament_edition

        if hasattr(obj, "team_participation"):
            participation = obj.team_participation
            if participation is not None:
                return participation.tournament_edition

        if hasattr(obj, "tournament_phase"):
            phase = obj.tournament_phase
            if phase is not None:
                return phase.tournament_edition

        if hasattr(obj, "match"):
            match = obj.match
            if match is not None and match.tournament_phase_id:
                return match.tournament_phase.tournament_edition

        if hasattr(obj, "tournament_phase_group"):
            group = obj.tournament_phase_group
            if group is not None:
                return group.tournament_phase.tournament_edition

        return None

    @staticmethod
    def get_accessible_edition_ids(user):
        """
        Returns:
        - None if user may access all editions (superuser or any global role)
        - list of edition ids for scoped-only users
        - empty list if no roles
        """
        if not user or not user.is_authenticated:
            return []
        if user.is_superuser:
            return None

        roles = UserRole.objects.filter(user=user)
        if roles.filter(tournament_edition__isnull=True).exists():
            return None

        return list(
            roles.exclude(tournament_edition=None).values_list(
                "tournament_edition_id",
                flat=True,
            )
        )