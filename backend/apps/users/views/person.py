from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Person
from apps.users.serializers.person_full import (
    PersonCreateUpdateSerializer,
    PersonDetailSerializer,
    PersonListSerializer,
)
from apps.users.services.person import PersonService


class PersonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Person.objects.select_related("status").all()

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
        output = PersonDetailSerializer(person, context=self.get_serializer_context())
        return Response(output.data)
