from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tournaments.models import (
    GlobalRuleTemplate,
    Sport,
    TournamentCategory,
    TournamentFormat,
    TournamentStatus,
)
from apps.tournaments.serializers.category import TournamentCategorySerializer
from apps.tournaments.serializers.edition import (
    TournamentFormatSerializer,
    TournamentStatusSerializer,
)
from apps.tournaments.serializers.global_rule_template import (
    GlobalRuleTemplateCreateSerializer,
    GlobalRuleTemplateSerializer,
)
from apps.tournaments.serializers.tournament import SportSerializer


class SportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SportSerializer
    queryset = Sport.objects.filter(is_active=True)
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]
    pagination_class = None


class TournamentStatusViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TournamentStatusSerializer
    queryset = TournamentStatus.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None


class TournamentFormatViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TournamentFormatSerializer
    queryset = TournamentFormat.objects.filter(is_active=True)
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "code"]
    ordering = ["order", "name"]
    pagination_class = None


class TournamentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TournamentCategorySerializer
    queryset = TournamentCategory.objects.filter(is_active=True)
    search_fields = ["name", "slug"]
    ordering_fields = ["order", "name"]
    ordering = ["order", "name"]
    pagination_class = None


class GlobalRuleTemplateViewSet(viewsets.ModelViewSet):
    """
    List built-in + user templates. Authenticated users can create new ones.
    System (seed) templates cannot be deleted.
    """

    permission_classes = [IsAuthenticated]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]
    pagination_class = None

    def get_queryset(self):
        return GlobalRuleTemplate.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == "create":
            return GlobalRuleTemplateCreateSerializer
        return GlobalRuleTemplateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = GlobalRuleTemplate.objects.create(
            **serializer.validated_data,
            is_system=False,
            is_active=True,
        )
        output = GlobalRuleTemplateSerializer(
            template,
            context=self.get_serializer_context(),
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        if template.is_system:
            raise ValidationError(
                {"detail": "Built-in rule templates cannot be deleted."},
            )
        template.is_active = False
        template.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
