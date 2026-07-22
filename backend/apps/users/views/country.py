from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.views.catalog import AdminWritableCatalogMixin
from apps.users.models import Country
from apps.users.serializers.person_full import CountrySerializer


class CountryViewSet(AdminWritableCatalogMixin, viewsets.ModelViewSet):
    read_permission_classes = [IsAuthenticated]
    serializer_class = CountrySerializer
    queryset = Country.objects.all()
    search_fields = ["name", "code", "iso2"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None
