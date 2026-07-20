from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0003_phase_group_unique_constraints"),
    ]

    operations = [
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="match_duration",
            new_name="match_duration_minutes",
        ),
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="allow_extra_time",
            new_name="has_extra_time",
        ),
        migrations.RenameField(
            model_name="globalruletemplate",
            old_name="allow_penalties",
            new_name="has_penalties",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="half_time_duration",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="max_team_fouls",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="notes",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="red_card_rules",
        ),
        migrations.RemoveField(
            model_name="globalruletemplate",
            name="yellow_card_rules",
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="ball_size",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="category",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="extra_time_minutes",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="field_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("full", "Full"),
                    ("reduced", "Reduced"),
                    ("indoor", "Indoor"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="full_rules_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="half_duration_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="has_offside",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="max_players_on_roster",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="players_per_team",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="globalruletemplate",
            name="unlimited_substitutions",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="has_extra_time",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="globalruletemplate",
            name="name",
            field=models.CharField(max_length=150, unique=True),
        ),
        migrations.AlterModelOptions(
            name="globalruletemplate",
            options={"ordering": ["name"]},
        ),
    ]
