from django.db import migrations, models
import django.db.models.deletion


PHASE_TYPE_MAP = {
    "GROUP_STAGE": "group_stage",
    "KNOCKOUT": "knockout",
    "FINAL": "knockout",
    "THIRD_PLACE": "third_place",
    "CUSTOM": "knockout",
    "group_stage": "group_stage",
    "knockout": "knockout",
    "third_place": "third_place",
    "league": "league",
}


def migrate_phase_types(apps, schema_editor):
    TournamentPhase = apps.get_model("tournaments", "TournamentPhase")
    for phase in TournamentPhase.objects.all():
        new_type = PHASE_TYPE_MAP.get(phase.phase_type, "knockout")
        if phase.phase_type != new_type:
            phase.phase_type = new_type
            phase.save(update_fields=["phase_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0004_expand_global_rule_template"),
    ]

    operations = [
        migrations.CreateModel(
            name="TournamentFormat",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("description", models.TextField(blank=True)),
                ("default_phases", models.JSONField(blank=True, default=list)),
                ("order", models.IntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "Tournament formats",
                "ordering": ["order", "name"],
            },
        ),
        migrations.AddField(
            model_name="tournamentedition",
            name="format",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="editions",
                to="tournaments.tournamentformat",
            ),
        ),
        migrations.AddField(
            model_name="tournamentphase",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.RenameField(
            model_name="tournamentphase",
            old_name="rules",
            new_name="config",
        ),
        migrations.RunPython(migrate_phase_types, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="tournamentphase",
            name="phase_type",
            field=models.CharField(
                choices=[
                    ("group_stage", "Group Stage"),
                    ("knockout", "Knockout"),
                    ("third_place", "Third Place"),
                    ("league", "League"),
                ],
                max_length=20,
            ),
        ),
    ]
