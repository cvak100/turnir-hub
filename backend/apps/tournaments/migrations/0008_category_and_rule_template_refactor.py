import django.db.models.deletion
from django.db import migrations, models
from django.utils.text import slugify


def migrate_edition_categories(apps, schema_editor):
    TournamentEdition = apps.get_model("tournaments", "TournamentEdition")
    TournamentCategory = apps.get_model("tournaments", "TournamentCategory")

    # Collect old string values from temporary column
    names = (
        TournamentEdition.objects.exclude(category_old="")
        .exclude(category_old__isnull=True)
        .values_list("category_old", flat=True)
        .distinct()
    )
    for name in names:
        name = (name or "").strip()
        if not name:
            continue
        slug = slugify(name)[:100] or f"cat-{abs(hash(name)) % 100000}"
        base = slug
        i = 2
        while TournamentCategory.objects.filter(slug=slug).exists():
            slug = f"{base}-{i}"[:100]
            i += 1
        cat, _ = TournamentCategory.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "is_active": True, "order": 0},
        )
        TournamentEdition.objects.filter(category_old=name).update(category=cat)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0007_global_rule_template_is_system"),
    ]

    operations = [
        # --- TournamentCategory ---
        migrations.CreateModel(
            name="TournamentCategory",
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
                ("name", models.CharField(max_length=150)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name_plural": "Tournament categories",
                "ordering": ["order", "name"],
            },
        ),
        # Rename old CharField so we can add FK with same logical name
        migrations.RenameField(
            model_name="tournamentedition",
            old_name="category",
            new_name="category_old",
        ),
        migrations.AddField(
            model_name="tournamentedition",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="editions",
                to="tournaments.tournamentcategory",
            ),
        ),
        migrations.RunPython(migrate_edition_categories, noop_reverse),
        migrations.RemoveField(
            model_name="tournamentedition",
            name="category_old",
        ),
        # --- GlobalRuleTemplate renames ---
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="half_duration_minutes",
            new_name="half_time_duration_minutes",
        ),
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="has_extra_time",
            new_name="allow_extra_time",
        ),
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="has_penalties",
            new_name="allow_penalties",
        ),
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="has_offside",
            new_name="offside_rule",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="category",
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="number_of_halves",
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="yellow_card_rules",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="red_card_rules",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="notes",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="allow_extra_time",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="offside_rule",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="extra_time_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="field_type",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="players_per_team",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="max_players_on_roster",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="max_substitutions",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="max_team_fouls",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name="globalruletemplate",
            options={
                "ordering": ["name"],
                "verbose_name_plural": "Global rule templates",
            },
        ),
    ]
