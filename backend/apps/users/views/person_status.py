from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.views.catalog import AdminWritableCatalogMixin
from apps.users.models import PersonStatus
from apps.users.serializers.person_full import PersonStatusSerializer


class PersonStatusViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    serializer_class = PersonStatusSerializer
    queryset = PersonStatus.objects.all()
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
