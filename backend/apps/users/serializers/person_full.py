from rest_framework import serializers

from apps.users.models import Person, PersonStatus


class PersonStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonStatus
        fields = ["id", "name", "code", "color"]


class PersonListSerializer(serializers.ModelSerializer):
    status = PersonStatusSerializer(read_only=True)

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "nickname",
            "email",
            "status",
            "show_as_anonymous",
        ]


class PersonDetailSerializer(serializers.ModelSerializer):
    status = PersonStatusSerializer(read_only=True)

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "nickname",
            "email",
            "phone",
            "date_of_birth",
            "status",
            "show_as_anonymous",
            "notes",
            "created_at",
            "updated_at",
        ]


class PersonCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = [
            "first_name",
            "last_name",
            "nickname",
            "email",
            "phone",
            "date_of_birth",
            "status",
            "show_as_anonymous",
            "notes",
        ]
