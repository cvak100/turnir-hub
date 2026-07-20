import { IntegerStepper } from "@/shared/components/IntegerStepper";
import type {
  GlobalRuleTemplate,
  GlobalRuleTemplateInput,
} from "@/modules/admin/services/tournamentService";

export type NewRuleTemplateFormState = {
  name: string;
  description: string;
  full_rules_text: string;
  players_per_team: string;
  max_players_on_roster: string;
  match_duration_minutes: string;
  half_time_duration_minutes: string;
  number_of_halves: string;
  ball_size: string;
  max_substitutions: string;
  points_for_win: string;
  points_for_draw: string;
  max_team_fouls: string;
  field_type: string;
  allow_extra_time: boolean;
  allow_penalties: boolean;
  offside_rule: boolean;
  unlimited_substitutions: boolean;
};

export function emptyNewRuleTemplateForm(): NewRuleTemplateFormState {
  return {
    name: "",
    description: "",
    full_rules_text: "",
    players_per_team: "",
    max_players_on_roster: "",
    match_duration_minutes: "",
    half_time_duration_minutes: "",
    number_of_halves: "2",
    ball_size: "",
    max_substitutions: "",
    points_for_win: "3",
    points_for_draw: "1",
    max_team_fouls: "",
    field_type: "",
    allow_extra_time: false,
    allow_penalties: true,
    offside_rule: false,
    unlimited_substitutions: false,
  };
}

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  full: "standardno (polno)",
  reduced: "zmanjšano",
  indoor: "dvorana",
  futsal: "futsal",
};

/** Build Slovenian rules text from numeric/boolean attributes. */
export function buildRulesTextFromAttributes(
  form: Pick<
    NewRuleTemplateFormState,
    | "players_per_team"
    | "max_players_on_roster"
    | "match_duration_minutes"
    | "half_time_duration_minutes"
    | "number_of_halves"
    | "ball_size"
    | "max_substitutions"
    | "points_for_win"
    | "points_for_draw"
    | "max_team_fouls"
    | "field_type"
    | "allow_extra_time"
    | "allow_penalties"
    | "offside_rule"
    | "unlimited_substitutions"
  >,
): string {
  const players = numOrNull(form.players_per_team);
  const roster = numOrNull(form.max_players_on_roster);
  const matchMin = numOrNull(form.match_duration_minutes);
  const halfMin = numOrNull(form.half_time_duration_minutes);
  const halves = numOrNull(form.number_of_halves) ?? 2;
  const ball = numOrNull(form.ball_size);
  const maxSubs = numOrNull(form.max_substitutions);
  const pointsWin = numOrNull(form.points_for_win) ?? 3;
  const pointsDraw = numOrNull(form.points_for_draw) ?? 1;
  const fouls = numOrNull(form.max_team_fouls);
  const lines: string[] = [];

  if (players != null || roster != null) {
    if (players != null && roster != null) {
      lines.push(
        `Število igralcev: ${players} na igrišču (max ${roster} na seznamu)`,
      );
    } else if (players != null) {
      lines.push(`Število igralcev: ${players} na igrišču`);
    } else {
      lines.push(`Max na seznamu: ${roster}`);
    }
  }

  if (matchMin != null && halves >= 1 && halfMin != null && halves === 2) {
    lines.push(`Trajanje tekme: ${halves} × ${halfMin} minut`);
  } else if (matchMin != null) {
    lines.push(`Trajanje tekme: ${matchMin} minut`);
    if (halves > 1) {
      lines.push(`Število polčasov: ${halves}`);
    }
    if (halfMin != null) {
      lines.push(`Polčas / odmor: ${halfMin} minut`);
    }
  } else if (halfMin != null) {
    lines.push(`Polčas / odmor: ${halfMin} minut`);
  }

  if (form.field_type) {
    lines.push(
      `Velikost igrišča: ${FIELD_TYPE_LABELS[form.field_type] ?? form.field_type}`,
    );
  }

  if (ball != null) {
    lines.push(`Žoga: velikost ${ball}`);
  }

  if (form.unlimited_substitutions) {
    lines.push("Menjave: neomejeno (leteče)");
  } else if (maxSubs != null) {
    lines.push(`Menjave: ${maxSubs}`);
  }

  lines.push(`Offside: ${form.offside_rule ? "da" : "ne"}`);
  lines.push(`Podaljšek: ${form.allow_extra_time ? "da" : "ne"}`);
  lines.push(`Enajstmetrovke: ${form.allow_penalties ? "da" : "ne"}`);

  if (fouls != null) {
    lines.push(`Max ekipne napake: ${fouls}`);
  }

  lines.push(`Točke: zmaga ${pointsWin}, remi ${pointsDraw}`);

  return lines.join("\n");
}

/** Prefer stored text; otherwise generate from template attributes. */
export function rulesTextForTemplate(tpl: GlobalRuleTemplate): string {
  const existing = (tpl.full_rules_text || "").trim();
  if (existing) return existing;
  return buildRulesTextFromAttributes({
    players_per_team:
      tpl.players_per_team != null ? String(tpl.players_per_team) : "",
    max_players_on_roster:
      tpl.max_players_on_roster != null
        ? String(tpl.max_players_on_roster)
        : "",
    match_duration_minutes:
      tpl.match_duration_minutes != null
        ? String(tpl.match_duration_minutes)
        : "",
    half_time_duration_minutes:
      tpl.half_time_duration_minutes != null
        ? String(tpl.half_time_duration_minutes)
        : "",
    number_of_halves: String(tpl.number_of_halves ?? 2),
    ball_size: tpl.ball_size != null ? String(tpl.ball_size) : "",
    max_substitutions:
      tpl.max_substitutions != null ? String(tpl.max_substitutions) : "",
    points_for_win: String(tpl.points_for_win ?? 3),
    points_for_draw: String(tpl.points_for_draw ?? 1),
    max_team_fouls:
      tpl.max_team_fouls != null ? String(tpl.max_team_fouls) : "",
    field_type: tpl.field_type || "",
    allow_extra_time: tpl.allow_extra_time,
    allow_penalties: tpl.allow_penalties,
    offside_rule: tpl.offside_rule,
    unlimited_substitutions: tpl.unlimited_substitutions,
  });
}

export function toRuleTemplateInput(
  form: NewRuleTemplateFormState,
): GlobalRuleTemplateInput {
  const customText = form.full_rules_text.trim();
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    full_rules_text: customText || buildRulesTextFromAttributes(form),
    players_per_team: numOrNull(form.players_per_team),
    max_players_on_roster: numOrNull(form.max_players_on_roster),
    match_duration_minutes: numOrNull(form.match_duration_minutes),
    half_time_duration_minutes: numOrNull(form.half_time_duration_minutes),
    number_of_halves: numOrNull(form.number_of_halves) ?? 2,
    ball_size: numOrNull(form.ball_size),
    max_substitutions: form.unlimited_substitutions
      ? null
      : numOrNull(form.max_substitutions),
    points_for_win: numOrNull(form.points_for_win) ?? 3,
    points_for_draw: numOrNull(form.points_for_draw) ?? 1,
    max_team_fouls: numOrNull(form.max_team_fouls),
    field_type: form.field_type,
    allow_extra_time: form.allow_extra_time,
    allow_penalties: form.allow_penalties,
    offside_rule: form.offside_rule,
    unlimited_substitutions: form.unlimited_substitutions,
  };
}

type Props = {
  value: NewRuleTemplateFormState;
  onChange: (next: NewRuleTemplateFormState) => void;
  disabled?: boolean;
};

export function NewRuleTemplateFormFields({
  value,
  onChange,
  disabled = false,
}: Props) {
  function set<K extends keyof NewRuleTemplateFormState>(
    key: K,
    next: NewRuleTemplateFormState[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <>
      <label>
        Ime
        <input
          value={value.name}
          disabled={disabled}
          onChange={(e) => set("name", e.target.value)}
          placeholder="npr. Moja pravila 2026"
          required
        />
      </label>
      <label>
        Kratek opis
        <input
          value={value.description}
          disabled={disabled}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Opcijsko"
        />
      </label>

      <label>
        Igralcev na igrišču
        <IntegerStepper
          value={value.players_per_team}
          onChange={(v) => set("players_per_team", v)}
          min={1}
          max={20}
          aria-label="Igralcev na igrišču"
        />
      </label>
      <label>
        Max na seznamu
        <IntegerStepper
          value={value.max_players_on_roster}
          onChange={(v) => set("max_players_on_roster", v)}
          min={1}
          max={50}
          aria-label="Max na seznamu"
        />
      </label>
      <label>
        Trajanje tekme (min)
        <IntegerStepper
          value={value.match_duration_minutes}
          onChange={(v) => set("match_duration_minutes", v)}
          min={1}
          max={180}
          aria-label="Trajanje tekme"
        />
      </label>
      <label>
        Polčas / odmor (min)
        <IntegerStepper
          value={value.half_time_duration_minutes}
          onChange={(v) => set("half_time_duration_minutes", v)}
          min={1}
          max={90}
          aria-label="Polčas ali odmor"
        />
      </label>
      <label>
        Število polčasov
        <IntegerStepper
          value={value.number_of_halves}
          onChange={(v) => set("number_of_halves", v)}
          min={1}
          max={4}
          emptyMeansNull={false}
          aria-label="Število polčasov"
        />
      </label>
      <label>
        Žoga (velikost)
        <IntegerStepper
          value={value.ball_size}
          onChange={(v) => set("ball_size", v)}
          min={3}
          max={5}
          aria-label="Velikost žoge"
        />
      </label>
      <label>
        Točke za zmago
        <IntegerStepper
          value={value.points_for_win}
          onChange={(v) => set("points_for_win", v)}
          min={0}
          max={10}
          emptyMeansNull={false}
          aria-label="Točke za zmago"
        />
      </label>
      <label>
        Točke za remi
        <IntegerStepper
          value={value.points_for_draw}
          onChange={(v) => set("points_for_draw", v)}
          min={0}
          max={10}
          emptyMeansNull={false}
          aria-label="Točke za remi"
        />
      </label>
      <label>
        Max ekipne napake
        <IntegerStepper
          value={value.max_team_fouls}
          onChange={(v) => set("max_team_fouls", v)}
          min={1}
          max={20}
          aria-label="Max ekipne napake"
        />
      </label>
      <label>
        Tip igrišča
        <select
          value={value.field_type}
          disabled={disabled}
          onChange={(e) => set("field_type", e.target.value)}
        >
          <option value="">—</option>
          <option value="full">Polno</option>
          <option value="reduced">Zmanjšano</option>
          <option value="indoor">Dvorana</option>
          <option value="futsal">Futsal</option>
        </select>
      </label>

      <label className="checkbox-row">
        <input
          className="sketch-check border-frame border-frame--sm"
          type="checkbox"
          checked={value.unlimited_substitutions}
          disabled={disabled}
          onChange={(e) => set("unlimited_substitutions", e.target.checked)}
        />
        Neomejene menjave
      </label>
      {!value.unlimited_substitutions ? (
        <label>
          Max menjav
          <IntegerStepper
            value={value.max_substitutions}
            onChange={(v) => set("max_substitutions", v)}
            min={0}
            max={20}
            aria-label="Max menjav"
          />
        </label>
      ) : null}
      <label className="checkbox-row">
        <input
          className="sketch-check border-frame border-frame--sm"
          type="checkbox"
          checked={value.allow_extra_time}
          disabled={disabled}
          onChange={(e) => set("allow_extra_time", e.target.checked)}
        />
        Podaljšek
      </label>
      <label className="checkbox-row">
        <input
          className="sketch-check border-frame border-frame--sm"
          type="checkbox"
          checked={value.allow_penalties}
          disabled={disabled}
          onChange={(e) => set("allow_penalties", e.target.checked)}
        />
        Enajstmetrovke
      </label>
      <label className="checkbox-row">
        <input
          className="sketch-check border-frame border-frame--sm"
          type="checkbox"
          checked={value.offside_rule}
          disabled={disabled}
          onChange={(e) => set("offside_rule", e.target.checked)}
        />
        Offside
      </label>

      <label>
        Besedilo pravil
        <textarea
          value={value.full_rules_text}
          disabled={disabled}
          onChange={(e) => set("full_rules_text", e.target.value)}
          rows={5}
          placeholder="Opcijsko — če pustiš prazno, se sestavi iz atributov zgoraj"
        />
      </label>
    </>
  );
}
