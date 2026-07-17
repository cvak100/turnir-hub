from django.db import transaction

from apps.users.models import Person


class PersonService:
    @staticmethod
    @transaction.atomic
    def create_person(*, data: dict) -> Person:
        return Person.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_person(*, person: Person, data: dict) -> Person:
        for attr, value in data.items():
            setattr(person, attr, value)
        person.save()
        return person
