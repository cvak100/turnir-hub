from rest_framework import serializers

from apps.tournaments.models import TournamentCategory


class TournamentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "order",
        ]
