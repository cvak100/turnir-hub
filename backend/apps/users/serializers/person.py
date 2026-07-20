from rest_framework import serializers

from apps.users.models import Person


class PersonMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "nickname"]
