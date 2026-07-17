from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from apps.players.models import Player, PlayerStatus
from apps.users.models import Person, PersonRole, PersonRoleType, PersonStatus


class PersonService:
    @staticmethod
    def _set_roles(*, person: Person, role_types: list[PersonRoleType] | None) -> None:
        if role_types is None:
            return
        desired_ids = {rt.id for rt in role_types}
        existing = {
            pr.role_type_id: pr
            for pr in PersonRole.objects.filter(person=person).select_related(
                "role_type"
            )
        }
        for role_type_id, pr in existing.items():
            if role_type_id not in desired_ids:
                pr.delete()
        for role_type in role_types:
            if role_type.id not in existing:
                PersonRole.objects.create(person=person, role_type=role_type)

    @staticmethod
    def _upsert_player(*, person: Person, player_data: dict | None, is_player: bool) -> None:
        if not is_player:
            try:
                player = person.player
            except ObjectDoesNotExist:
                return
            player.is_active = False
            player.save(update_fields=["is_active", "updated_at"])
            return

        defaults_status = PlayerStatus.objects.filter(code="active").first()
        if defaults_status is None:
            defaults_status = PlayerStatus.objects.order_by("order").first()
        if defaults_status is None:
            raise ValueError("No PlayerStatus available; run seed_statuses.")

        try:
            player = person.player
        except ObjectDoesNotExist:
            player = Player(person=person, status=defaults_status)

        data = player_data or {}
        if "position" in data:
            player.position = data["position"] or ""
        if "secondary_position" in data:
            player.secondary_position = data["secondary_position"] or ""
        if "jersey_number" in data:
            player.preferred_jersey_number = data["jersey_number"]
        if "preferred_foot" in data:
            player.dominant_foot = data["preferred_foot"] or ""
        if "height" in data:
            player.height_cm = data["height"]
        if "weight" in data:
            player.weight_kg = data["weight"]
        if "current_club" in data:
            player.current_club = data["current_club"] or ""
        if "contract_until" in data:
            player.contract_until = data["contract_until"]
        if "player_status" in data and data["player_status"] is not None:
            player.status = data["player_status"]
        elif not player.status_id:
            player.status = defaults_status

        player.is_active = True
        player.save()

    @staticmethod
    @transaction.atomic
    def create_person(*, data: dict) -> Person:
        payload = dict(data)
        role_types = payload.pop("roles", None)
        player_data = payload.pop("player", None)
        if payload.get("status") is None:
            payload["status"] = PersonStatus.objects.get(code="active")
        person = Person.objects.create(**payload)
        PersonService._set_roles(person=person, role_types=role_types)
        is_player = bool(
            role_types
            and any(rt.code == "player" for rt in role_types)
        )
        PersonService._upsert_player(
            person=person,
            player_data=player_data,
            is_player=is_player,
        )
        return person

    @staticmethod
    @transaction.atomic
    def update_person(*, person: Person, data: dict) -> Person:
        payload = dict(data)
        role_types = payload.pop("roles", None) if "roles" in payload else None
        player_data = payload.pop("player", None) if "player" in payload else None
        for attr, value in payload.items():
            setattr(person, attr, value)
        person.save()
        if role_types is not None:
            PersonService._set_roles(person=person, role_types=role_types)

        if role_types is not None:
            is_player = any(rt.code == "player" for rt in role_types)
        else:
            is_player = person.person_roles.filter(role_type__code="player").exists()

        if player_data is not None or role_types is not None:
            PersonService._upsert_player(
                person=person,
                player_data=player_data,
                is_player=is_player,
            )
        return person
