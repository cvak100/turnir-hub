from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.models import PersonStatus
from apps.users.serializers.person_full import PersonStatusSerializer


class PersonStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PersonStatusSerializer
    queryset = PersonStatus.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
