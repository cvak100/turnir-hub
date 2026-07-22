from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.views.catalog import AdminWritableCatalogMixin
from apps.users.models import PersonRoleType
from apps.users.serializers.person_full import PersonRoleTypeSerializer


class PersonRoleTypeViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    """Lookup list for person content roles (not auth roles)."""

    read_permission_classes = [IsAuthenticated]
    serializer_class = PersonRoleTypeSerializer
    queryset = PersonRoleType.objects.all()
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
