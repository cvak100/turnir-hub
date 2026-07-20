import django_filters
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Person, PersonRole
from apps.users.permissions import HasPermission
from apps.users.permissions.utils import set_action_permission
from apps.users.serializers.person_full import (
    PersonCreateUpdateSerializer,
    PersonDetailSerializer,
    PersonListSerializer,
)
from apps.users.services.person import PersonService


class PersonFilter(django_filters.FilterSet):
    role = django_filters.CharFilter(
        field_name="person_roles__role_type__code",
        lookup_expr="exact",
    )
    role_type = django_filters.NumberFilter(
        field_name="person_roles__role_type_id",
    )

    class Meta:
        model = Person
        fields = ["status", "show_as_anonymous", "role", "role_type"]


class PersonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Person.objects.select_related(
        "status",
        "nationality",
        "user",
        "player",
        "player__status",
    ).prefetch_related(
        Prefetch(
            "person_roles",
            queryset=PersonRole.objects.select_related("role_type").order_by(
                "role_type__order",
                "role_type__name",
            ),
        )
    )
    filterset_class = PersonFilter
    search_fields = ["first_name", "last_name", "nickname", "email"]
    ordering_fields = [
        "id",
        "first_name",
        "last_name",
        "nickname",
        "email",
        "created_at",
    ]
    ordering = ["last_name", "first_name"]

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.request.query_params.get("role") or self.request.query_params.get(
            "role_type"
        ):
            qs = qs.distinct()
        return qs

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            set_action_permission(
                self,
                {
                    "create": "admin.full_access",
                    "update": "admin.full_access",
                    "partial_update": "admin.full_access",
                    "destroy": "admin.full_access",
                },
                default="admin.full_access",
            )
            return [HasPermission()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return PersonListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return PersonCreateUpdateSerializer
        return PersonDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        person = PersonService.create_person(data=serializer.validated_data)
        person = self.get_queryset().get(pk=person.pk)
        output = PersonDetailSerializer(person, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        person = self.get_object()
        serializer = self.get_serializer(person, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        person = PersonService.update_person(
            person=person,
            data=serializer.validated_data,
        )
        person = self.get_queryset().get(pk=person.pk)
        output = PersonDetailSerializer(person, context=self.get_serializer_context())
        return Response(output.data)
