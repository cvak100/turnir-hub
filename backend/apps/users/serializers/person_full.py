from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from apps.players.models import Player, PlayerStatus
from apps.users.models import Country, Person, PersonRoleType, PersonStatus

ROLE_FLAGS = (
    ("is_player", "player"),
    ("is_coach", "coach"),
    ("is_referee", "referee"),
    ("is_staff", "staff"),
    ("is_official", "official"),
)


class PersonStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonStatus
        fields = ["id", "name", "code", "color"]


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ["id", "name", "code", "iso2", "order", "is_active"]


class PlayerStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerStatus
        fields = ["id", "name", "code", "color"]


class PersonRoleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonRoleType
        fields = ["id", "name", "code", "description", "order", "is_active"]


class PersonRoleTypeBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonRoleType
        fields = ["id", "name", "code"]


class RoleTypeInputField(serializers.Field):
    """Accepts a list of PersonRoleType primary keys and/or codes."""

    default_error_messages = {
        "not_a_list": "Expected a list of role ids or codes.",
        "invalid": "Unknown role: {value}.",
    }

    def to_internal_value(self, data):
        if not isinstance(data, list):
            self.fail("not_a_list")

        resolved: list[PersonRoleType] = []
        seen: set[int] = set()
        for item in data:
            role_type = self._resolve_one(item)
            if role_type.id in seen:
                continue
            seen.add(role_type.id)
            resolved.append(role_type)
        return resolved

    def _resolve_one(self, item) -> PersonRoleType:
        if isinstance(item, bool):
            self.fail("invalid", value=item)
        if isinstance(item, int) or (isinstance(item, str) and item.isdigit()):
            role_type = PersonRoleType.objects.filter(pk=int(item)).first()
        elif isinstance(item, str):
            role_type = PersonRoleType.objects.filter(code=str(item)).first()
        else:
            self.fail("invalid", value=item)
        if role_type is None:
            self.fail("invalid", value=item)
        return role_type

    def to_representation(self, value):
        return PersonRoleTypeBriefSerializer(value, many=True).data


class PlayerNestedSerializer(serializers.Serializer):
    position = serializers.CharField(required=False, allow_blank=True, max_length=10)
    secondary_position = serializers.CharField(
        required=False, allow_blank=True, max_length=10
    )
    jersey_number = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=99
    )
    preferred_foot = serializers.CharField(
        required=False, allow_blank=True, max_length=10
    )
    height = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=300
    )
    weight = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=300
    )
    current_club = serializers.CharField(
        required=False, allow_blank=True, max_length=150
    )
    player_status = serializers.PrimaryKeyRelatedField(
        queryset=PlayerStatus.objects.all(),
        required=False,
        allow_null=True,
    )
    contract_until = serializers.DateField(required=False, allow_null=True)

    def to_representation(self, instance: Player):
        return {
            "id": instance.id,
            "position": instance.position,
            "secondary_position": instance.secondary_position,
            "jersey_number": instance.preferred_jersey_number,
            "preferred_foot": instance.dominant_foot,
            "height": instance.height_cm,
            "weight": instance.weight_kg,
            "current_club": instance.current_club,
            "player_status": (
                PlayerStatusSerializer(instance.status).data
                if instance.status_id
                else None
            ),
            "contract_until": instance.contract_until,
            "is_active": instance.is_active,
        }


def _role_codes(person: Person) -> set[str]:
    return {pr.role_type.code for pr in person.person_roles.all()}


def _roles_brief(person: Person) -> list[dict]:
    role_types = [pr.role_type for pr in person.person_roles.all()]
    role_types = sorted(role_types, key=lambda rt: (rt.order, rt.name))
    return PersonRoleTypeBriefSerializer(role_types, many=True).data


def _role_flags(person: Person) -> dict[str, bool]:
    codes = _role_codes(person)
    return {flag: code in codes for flag, code in ROLE_FLAGS}


class PersonListSerializer(serializers.ModelSerializer):
    status = PersonStatusSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    is_player = serializers.SerializerMethodField()
    is_coach = serializers.SerializerMethodField()
    is_referee = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()
    is_official = serializers.SerializerMethodField()

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
            "roles",
            "is_player",
            "is_coach",
            "is_referee",
            "is_staff",
            "is_official",
        ]

    def get_roles(self, obj: Person) -> list[dict]:
        return _roles_brief(obj)

    def get_is_player(self, obj: Person) -> bool:
        return "player" in _role_codes(obj)

    def get_is_coach(self, obj: Person) -> bool:
        return "coach" in _role_codes(obj)

    def get_is_referee(self, obj: Person) -> bool:
        return "referee" in _role_codes(obj)

    def get_is_staff(self, obj: Person) -> bool:
        return "staff" in _role_codes(obj)

    def get_is_official(self, obj: Person) -> bool:
        return "official" in _role_codes(obj)


class PersonDetailSerializer(serializers.ModelSerializer):
    status = PersonStatusSerializer(read_only=True)
    nationality = CountrySerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    is_player = serializers.SerializerMethodField()
    is_coach = serializers.SerializerMethodField()
    is_referee = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()
    is_official = serializers.SerializerMethodField()
    player = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "nickname",
            "date_of_birth",
            "place_of_birth",
            "nationality",
            "gender",
            "photo",
            "bio",
            "status",
            "email",
            "phone",
            "city",
            "country",
            "show_as_anonymous",
            "notes",
            "roles",
            "is_player",
            "is_coach",
            "is_referee",
            "is_staff",
            "is_official",
            "player",
            "created_at",
            "updated_at",
        ]

    def get_photo(self, obj: Person) -> str | None:
        if not obj.photo:
            return None
        request = self.context.get("request")
        url = obj.photo.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_roles(self, obj: Person) -> list[dict]:
        return _roles_brief(obj)

    def get_is_player(self, obj: Person) -> bool:
        return "player" in _role_codes(obj)

    def get_is_coach(self, obj: Person) -> bool:
        return "coach" in _role_codes(obj)

    def get_is_referee(self, obj: Person) -> bool:
        return "referee" in _role_codes(obj)

    def get_is_staff(self, obj: Person) -> bool:
        return "staff" in _role_codes(obj)

    def get_is_official(self, obj: Person) -> bool:
        return "official" in _role_codes(obj)

    def get_player(self, obj: Person):
        try:
            player = obj.player
        except ObjectDoesNotExist:
            return None
        return PlayerNestedSerializer(player).data


class PersonCreateUpdateSerializer(serializers.ModelSerializer):
    status = serializers.PrimaryKeyRelatedField(
        queryset=PersonStatus.objects.all(),
        required=False,
        allow_null=True,
    )
    nationality = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    roles = RoleTypeInputField(required=False)
    is_player = serializers.BooleanField(required=False)
    is_coach = serializers.BooleanField(required=False)
    is_referee = serializers.BooleanField(required=False)
    is_staff = serializers.BooleanField(required=False)
    is_official = serializers.BooleanField(required=False)
    player = PlayerNestedSerializer(required=False, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Person
        fields = [
            "first_name",
            "last_name",
            "nickname",
            "date_of_birth",
            "place_of_birth",
            "nationality",
            "gender",
            "photo",
            "bio",
            "status",
            "email",
            "phone",
            "city",
            "country",
            "show_as_anonymous",
            "notes",
            "roles",
            "is_player",
            "is_coach",
            "is_referee",
            "is_staff",
            "is_official",
            "player",
        ]

    def validate(self, attrs):
        flag_keys = [flag for flag, _ in ROLE_FLAGS]
        if any(k in attrs for k in flag_keys) and "roles" not in attrs:
            # Build roles from flags, preserving any non-flag roles on update.
            existing_codes: set[str] = set()
            if self.instance is not None:
                existing_codes = {
                    pr.role_type.code for pr in self.instance.person_roles.all()
                }
            flag_codes = {code for _, code in ROLE_FLAGS}
            keep = existing_codes - flag_codes
            for flag, code in ROLE_FLAGS:
                if flag in attrs and attrs[flag]:
                    keep.add(code)
                elif flag in attrs and not attrs[flag]:
                    keep.discard(code)
                elif flag not in attrs and code in existing_codes:
                    keep.add(code)
            attrs["roles"] = list(
                PersonRoleType.objects.filter(code__in=keep)
            )
        for flag, _ in ROLE_FLAGS:
            attrs.pop(flag, None)
        return attrs
