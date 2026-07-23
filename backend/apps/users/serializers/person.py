from rest_framework import serializers

from apps.users.models import Person


class PersonMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "nickname"]


class PersonPublicSerializer(serializers.ModelSerializer):
    """Public-facing person fields for player profiles (no email/phone/notes)."""

    nationality_name = serializers.CharField(
        source="nationality.name",
        read_only=True,
        allow_null=True,
    )
    player_id = serializers.SerializerMethodField()
    last_club = serializers.SerializerMethodField()
    matches_played = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "nickname",
            "date_of_birth",
            "place_of_birth",
            "nationality_name",
            "gender",
            "photo",
            "bio",
            "city",
            "country",
            "show_as_anonymous",
            "player_id",
            "last_club",
            "matches_played",
            "roles",
        ]

    def get_roles(self, obj: Person) -> list[dict]:
        roles = []
        for pr in obj.person_roles.all():
            rt = pr.role_type
            if rt is None or not rt.is_active:
                continue
            roles.append({"id": rt.id, "code": rt.code, "name": rt.name})
        roles.sort(key=lambda r: (r.get("name") or "", r.get("code") or ""))
        return roles

    def get_player_id(self, obj: Person) -> int | None:
        player = self._player(obj)
        return player.id if player is not None else None

    def get_last_club(self, obj: Person) -> str | None:
        player = self._player(obj)
        if player is None:
            return None
        # Prefetched ordered participations — first is the latest.
        for row in player.participations.all():
            part = row.team_participation
            name = part.participation_name or (
                part.team.name if part.team_id else None
            )
            if name:
                return name
        club = (player.current_club or "").strip()
        return club or None

    def get_matches_played(self, obj: Person) -> int:
        player = self._player(obj)
        if player is None:
            return 0
        total = 0
        for row in player.participations.all():
            edition = row.team_participation.tournament_edition
            if getattr(edition, "is_public", False):
                total += row.matches_played or 0
        return total

    def _player(self, obj: Person):
        from django.core.exceptions import ObjectDoesNotExist

        try:
            return obj.player
        except ObjectDoesNotExist:
            return None
