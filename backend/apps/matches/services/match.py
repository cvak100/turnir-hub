from django.db import transaction

from apps.matches.models import Match, MatchEvent


class MatchService:
    @staticmethod
    @transaction.atomic
    def create_match(*, data: dict) -> Match:
        return Match.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def update_match(*, match: Match, data: dict) -> Match:
        for attr, value in data.items():
            setattr(match, attr, value)
        match.save()
        return match


class MatchEventService:
    @staticmethod
    @transaction.atomic
    def create_event(*, data: dict, user=None) -> MatchEvent:
        return MatchEvent.objects.create(created_by=user, **data)

    @staticmethod
    @transaction.atomic
    def update_event(*, event: MatchEvent, data: dict) -> MatchEvent:
        for attr, value in data.items():
            setattr(event, attr, value)
        event.save()
        return event
