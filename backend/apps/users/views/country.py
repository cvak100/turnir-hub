from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.users.models import Country
from apps.users.serializers.person_full import CountrySerializer


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CountrySerializer
    queryset = Country.objects.filter(is_active=True)
    search_fields = ["name", "code", "iso2"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
