from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "code", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    permission_ids = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "permissions",
            "permission_ids",
            "created_at",
            "updated_at",
        ]

    def get_permissions(self, obj: Role) -> list[dict]:
        perms = [
            PermissionSerializer(rp.permission).data
            for rp in obj.role_permissions.all()
        ]
        perms.sort(key=lambda p: p.get("code") or "")
        return perms

    def get_permission_ids(self, obj: Role) -> list[int]:
        return [rp.permission_id for rp in obj.role_permissions.all()]


class RoleWriteSerializer(serializers.ModelSerializer):
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )

    class Meta:
        model = Role
        fields = [
            "name",
            "slug",
            "description",
            "is_active",
            "permission_ids",
        ]

    def create(self, validated_data):
        permission_ids = validated_data.pop("permission_ids", [])
        role = Role.objects.create(**validated_data)
        self._set_permissions(role, permission_ids)
        return role

    def update(self, instance, validated_data):
        permission_ids = validated_data.pop("permission_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permission_ids is not None:
            self._set_permissions(instance, permission_ids)
        return instance

    def _set_permissions(self, role: Role, permission_ids: list[int]) -> None:
        desired = set(permission_ids)
        existing = {
            rp.permission_id: rp
            for rp in RolePermission.objects.filter(role=role)
        }
        for pid, rp in existing.items():
            if pid not in desired:
                rp.delete()
        for pid in desired:
            if pid not in existing:
                RolePermission.objects.create(role=role, permission_id=pid)


class AuthUserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "is_staff", "is_superuser"]


class UserRoleSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    role_slug = serializers.CharField(source="role.slug", read_only=True)
    tournament_edition_name = serializers.CharField(
        source="tournament_edition.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = UserRole
        fields = [
            "id",
            "user",
            "user_username",
            "role",
            "role_name",
            "role_slug",
            "tournament_edition",
            "tournament_edition_name",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class UserRoleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ["user", "role", "tournament_edition"]

    def validate(self, attrs):
        user = attrs.get("user")
        role = attrs.get("role")
        edition = attrs.get("tournament_edition")
        qs = UserRole.objects.filter(user=user, role=role)
        if edition is None:
            qs = qs.filter(tournament_edition__isnull=True)
        else:
            qs = qs.filter(tournament_edition=edition)
        if qs.exists():
            raise serializers.ValidationError(
                "Ta uporabnik že ima to vlogo za izbrano edicijo."
            )
        return attrs
