from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.users.models import Permission, Role, RolePermission, UserRole
from apps.users.permissions.admin import IsDashboardAdmin
from apps.users.serializers.rbac import (
    AuthUserBriefSerializer,
    PermissionSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    UserRoleCreateSerializer,
    UserRoleSerializer,
)

User = get_user_model()


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDashboardAdmin]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.all().order_by("code")
    search_fields = ["name", "code"]
    pagination_class = None


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDashboardAdmin]
    search_fields = ["name", "slug"]
    ordering = ["name"]
    pagination_class = None

    def get_queryset(self):
        return Role.objects.prefetch_related(
            Prefetch(
                "role_permissions",
                queryset=RolePermission.objects.select_related("permission"),
            )
        ).all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RoleWriteSerializer
        return RoleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        role = self.get_queryset().get(pk=role.pk)
        return Response(
            RoleSerializer(role).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        role = self.get_queryset().get(pk=role.pk)
        return Response(RoleSerializer(role).data)


class UserRoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDashboardAdmin]
    http_method_names = ["get", "post", "delete", "head", "options"]
    filterset_fields = ["user", "role", "tournament_edition"]
    search_fields = ["user__username", "role__name", "role__slug"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return UserRole.objects.select_related(
            "user",
            "role",
            "tournament_edition",
        ).all()

    def get_serializer_class(self):
        if self.action == "create":
            return UserRoleCreateSerializer
        return UserRoleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        obj = self.get_queryset().get(pk=obj.pk)
        return Response(
            UserRoleSerializer(obj).data,
            status=status.HTTP_201_CREATED,
        )


class AuthUserViewSet(viewsets.ReadOnlyModelViewSet):
    """Brief user list for assigning roles (admin only)."""

    permission_classes = [IsDashboardAdmin]
    serializer_class = AuthUserBriefSerializer
    queryset = User.objects.all().order_by("username")
    search_fields = ["username", "email"]
    pagination_class = None
