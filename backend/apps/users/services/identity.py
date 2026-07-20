from django.contrib.auth import get_user_model

from apps.users.models import Person

User = get_user_model()


def get_person_for_user(user) -> Person | None:
    """Return the Person linked to this auth user, or None."""
    if not user or not getattr(user, "is_authenticated", False):
        return None
    try:
        return user.person
    except Person.DoesNotExist:
        return None


def get_user_for_person(person: Person) -> User | None:
    """Return the auth User linked to this person, or None."""
    return person.user
