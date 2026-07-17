from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.models import PersonRoleType
from apps.users.serializers.person_full import PersonRoleTypeSerializer


class PersonRoleTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Lookup list for person content roles (not auth roles)."""

    permission_classes = [IsAuthenticated]
    serializer_class = PersonRoleTypeSerializer
    queryset = PersonRoleType.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
