import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  IntegerStepper,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { EditionManageNav } from "../EditionManageNav";
import {
  adminTournamentService,
  sortRuleTemplates,
} from "@/modules/admin/services/tournamentService";
import {
  emptyNewRuleTemplateForm,
  NewRuleTemplateFormFields,
  rulesTextForTemplate,
  toRuleTemplateInput,
  type NewRuleTemplateFormState,
} from "@/modules/admin/components/NewRuleTemplateFormFields";
import { editionService, type EditionDetail, type FormatConfig } from "@/modules/editions/services/editionService";
import {
  teamParticipationService,
  type TeamParticipationListItem,
} from "@/modules/teams/services/teamService";
import {
  groupService,
  groupTeamService,
  matchService,
  phaseService,
  type GroupListItem,
  type GroupTeamItem,
  type MatchListItem,
  type PhaseListItem,
} from "@/modules/matches/services/matchService";

const KNOCKOUT_ROUND_PRESETS = [
  { code: "round_of_128", name: "1/64 finale", phase_type: "knockout", matches: 64 },
  { code: "round_of_64", name: "1/32 finale", phase_type: "knockout", matches: 32 },
  { code: "round_of_32", name: "1/16 finale", phase_type: "knockout", matches: 16 },
  { code: "round_of_16", name: "1/8 finale", phase_type: "knockout", matches: 8 },
  { code: "quarterfinal", name: "Četrtfinale", phase_type: "knockout", matches: 4 },
  { code: "semifinal", name: "Polfinale", phase_type: "knockout", matches: 2 },
  { code: "final", name: "Finale", phase_type: "knockout", matches: 1 },
  { code: "third_place", name: "Za 3. mesto", phase_type: "third_place", matches: 1 },
] as const;

/** Read HH:mm from ISO datetime (time-only UI; date is ignored). */
function timeFromMatchDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

/** Store time on match_date with a fixed date (date not used in UI). */
function matchDateFromTime(time: string): string | null {
  const trimmed = time.trim();
  if (!trimmed) return null;
  const hhmm = trimmed.slice(0, 5);
  return `2000-01-01T${hhmm}:00Z`;
}

const DEFAULT_GROUP_CONFIG = {
  number_of_groups: 4,
  teams_per_group: 4,
  teams_advancing_per_group: 2,
  advancement: {
    mode: "per_group" as const,
    teams_per_group: 2,
  },
  points_for_win: 3,
  points_for_draw: 1,
  ranking_criteria: [
    "points",
    "goal_difference",
    "goals_for",
    "head_to_head_points",
    "head_to_head_goal_difference",
    "head_to_head_goals_for",
    "team_name",
  ],
};

type AdvancementMode = "per_group" | "best_of_place";

type AdvancementState = {
  mode: AdvancementMode;
  perGroup: number;
  autoPlaces: number;
  wildcardPlace: number;
  wildcardCount: number;
};

function asNum(
  config: Record<string, unknown> | null | undefined,
  key: string,
  fallback: number,
) {
  const v = config?.[key];
  return typeof v === "number" ? v : fallback;
}

function parseAdvancement(cfg: Record<string, unknown>): AdvancementState {
  const raw = cfg.advancement;
  const adv =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : null;

  if (adv?.mode === "best_of_place") {
    return {
      mode: "best_of_place",
      perGroup: 2,
      autoPlaces: asNum(adv, "auto_places", 1),
      wildcardPlace: asNum(adv, "wildcard_place", 2),
      wildcardCount: asNum(adv, "wildcard_count", 2),
    };
  }

  const perGroup = asNum(
    adv,
    "teams_per_group",
    asNum(cfg, "teams_advancing_per_group", 2),
  );
  return {
    mode: "per_group",
    perGroup,
    autoPlaces: 1,
    wildcardPlace: 2,
    wildcardCount: 2,
  };
}

function advancementToConfig(a: AdvancementState) {
  if (a.mode === "best_of_place") {
    return {
      mode: "best_of_place" as const,
      auto_places: a.autoPlaces,
      wildcard_place: a.wildcardPlace,
      wildcard_count: a.wildcardCount,
    };
  }
  return {
    mode: "per_group" as const,
    teams_per_group: a.perGroup,
  };
}

function calcAdvancingTotal(numberOfGroups: number, a: AdvancementState): number {
  if (a.mode === "best_of_place") {
    return numberOfGroups * a.autoPlaces + a.wildcardCount;
  }
  return numberOfGroups * a.perGroup;
}

function placeLabel(n: number): string {
  return `${n}. mesto`;
}

function describeAdvancement(numberOfGroups: number, a: AdvancementState): string {
  const total = calcAdvancingTotal(numberOfGroups, a);
  if (a.mode === "best_of_place") {
    const auto =
      a.autoPlaces === 1
        ? `vseh ${numberOfGroups}× 1. mesto`
        : `${numberOfGroups}× prvih ${a.autoPlaces} mest`;
    return (
      `${auto} + ${a.wildcardCount} najboljših ` +
      `${placeLabel(a.wildcardPlace)} = ${total} ekip`
    );
  }
  return `${numberOfGroups}× ${a.perGroup} = ${total} ekip`;
}

export function EditionPhasesPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, isAdmin } = useAuth();
  const canEdit =
    isAdmin ||
    hasPermission("edition.edit", editionId) ||
    hasPermission("edition.manage", editionId);

  const edition = useAsyncData(() => editionService.get(editionId), [editionId]);
  const formats = useAsyncData(() => adminTournamentService.listFormats(), []);

  const [phases, setPhases] = useState<PhaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [formatId, setFormatId] = useState("");
  const [boardTick, setBoardTick] = useState(0);
  const [forceKnockout, setForceKnockout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await phaseService.list({
        tournament_edition: editionId,
        ordering: "order",
        page_size: 100,
      });
      setPhases(page.results);
      setBoardTick((t) => t + 1);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (edition.data?.format?.id) {
      setFormatId(String(edition.data.format.id));
    }
  }, [edition.data]);

  const groupPhases = useMemo(
    () => phases.filter((p) => p.phase_type === "group_stage"),
    [phases],
  );
  const primaryGroupPhase = useMemo(() => {
    if (groupPhases.length === 0) return null;
    return [...groupPhases].sort((a, b) => a.order - b.order)[0] ?? null;
  }, [groupPhases]);
  const extraGroupPhases = useMemo(() => {
    if (!primaryGroupPhase) return [];
    return groupPhases.filter((p) => p.id !== primaryGroupPhase.id);
  }, [groupPhases, primaryGroupPhase]);
  const knockoutPhases = useMemo(
    () =>
      phases
        .filter(
          (p) => p.phase_type === "knockout" || p.phase_type === "third_place",
        )
        .sort((a, b) => a.order - b.order),
    [phases],
  );
  const leaguePhases = useMemo(
    () => phases.filter((p) => p.phase_type === "league"),
    [phases],
  );

  const selectedFormatCode = useMemo(() => {
    const f = (formats.data ?? []).find((x) => String(x.id) === formatId);
    return f?.code ?? edition.data?.format?.code ?? "";
  }, [formats.data, formatId, edition.data]);

  const showGroupZone =
    selectedFormatCode === "group_knockout" ||
    selectedFormatCode === "groups_only" ||
    !!primaryGroupPhase;
  const showKnockoutZone =
    selectedFormatCode === "group_knockout" ||
    selectedFormatCode === "knockout" ||
    selectedFormatCode === "double_elimination" ||
    selectedFormatCode === "custom" ||
    knockoutPhases.length > 0;

  async function applyFormat() {
    if (!formatId) return;
    setBusy(true);
    setError(null);
    try {
      await editionService.update(editionId, {
        format: Number(formatId),
        apply_format_phases: false,
        replace_format_phases: false,
      });
      await edition.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveFormatConfigAndGenerate(replace: boolean) {
    setBusy(true);
    setError(null);
    try {
      await editionService.generateStructure(editionId, { replace });
      await load();
      await edition.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function generateRealGroupMatches(replace: boolean) {
    setBusy(true);
    setError(null);
    try {
      await editionService.generateGroupMatches(editionId, { replace });
      setBoardTick((t) => t + 1);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function fillKnockoutBracket(replace: boolean) {
    setBusy(true);
    setError(null);
    try {
      await editionService.fillKnockout(editionId, {
        replace,
        force: forceKnockout,
      });
      setBoardTick((t) => t + 1);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function ensureGroupPhase() {
    if (primaryGroupPhase) return;
    setBusy(true);
    setError(null);
    try {
      const nextOrder =
        phases.reduce((max, p) => Math.max(max, p.order), 0) + 1;
      await phaseService.create({
        tournament_edition: editionId,
        name: "Skupinski del",
        phase_type: "group_stage",
        order: nextOrder,
        is_active: true,
        config: DEFAULT_GROUP_CONFIG,
      });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function addKnockoutRound(
    preset: (typeof KNOCKOUT_ROUND_PRESETS)[number],
  ) {
    setBusy(true);
    setError(null);
    try {
      const nextOrder =
        phases.reduce((max, p) => Math.max(max, p.order), 0) + 1;
      await phaseService.create({
        tournament_edition: editionId,
        name: preset.name,
        phase_type: preset.phase_type,
        order: nextOrder,
        is_active: true,
        config: {
          round_code: preset.code,
          home_and_away: false,
          advantage_for_better_ranked: true,
          number_of_teams: preset.matches * 2,
        },
      });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function moveKnockout(phaseId: number, direction: -1 | 1) {
    const sorted = [...knockoutPhases];
    const idx = sorted.findIndex((p) => p.id === phaseId);
    const other = sorted[idx + direction];
    if (idx < 0 || !other) return;

    const orderA = sorted[idx].order;
    const orderB = other.order;
    const temp =
      Math.max(0, ...phases.map((p) => p.order)) + 1000;

    setBusy(true);
    setError(null);
    try {
      await phaseService.update(phaseId, { order: temp });
      await phaseService.update(other.id, { order: orderA });
      await phaseService.update(phaseId, { order: orderB });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deletePhase(phaseId: number) {
    const ok = window.confirm("Izbrišem to fazo / rundo?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await phaseService.delete(phaseId);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const formatList = formats.data ?? [];
  const usedRoundCodes = new Set(
    knockoutPhases.map((p) => {
      const code = p.config?.round_code;
      return typeof code === "string" ? code : "";
    }),
  );

  return (
    <div className="page">
      <PageHeader
        title={
          edition.data ? `Faze — ${edition.data.name}` : "Faze edicije"
        }
        subtitle="Nastavi območja, nato ekipe in tekme"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            ← Nazaj na edicijo
          </Link>
        }
      />

      <EditionManageNav editionId={editionId} />

      <ErrorBanner error={error ?? edition.error ?? formats.error} />

      {canEdit ? (
        <section className="border-frame border-frame--md">
          <h2>Format</h2>
          <div className="row-actions" style={{ flexWrap: "wrap" }}>
            <label className="admin-search">
              Format
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
              >
                <option value="">—</option>
                {formatList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy || !formatId}
              onClick={() => void applyFormat()}
            >
              Shrani format
            </button>
          </div>
          <p className="muted">
            Izberi format, nato spodaj shrani nastavitve in generiraj ogrodje
            faz (skupine + knockout runde).
          </p>
        </section>
      ) : null}

      {!edition.loading && edition.data && canEdit ? (
        <FormatConfigPanel
          editionId={editionId}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          onAfterSave={() => void edition.reload()}
          onGenerateStructure={(replace) =>
            void saveFormatConfigAndGenerate(replace)
          }
          onGenerateGroupMatches={(replace) =>
            void generateRealGroupMatches(replace)
          }
          onFillKnockout={(replace) => void fillKnockoutBracket(replace)}
          forceKnockout={forceKnockout}
          setForceKnockout={setForceKnockout}
          hasGroupPhase={!!primaryGroupPhase}
          hasKnockout={knockoutPhases.length > 0}
          hasAnyPhases={phases.length > 0}
        />
      ) : null}

      {!edition.loading && edition.data ? (
        <EditionSportRulesPanel
          editionId={editionId}
          edition={edition.data}
          canEdit={canEdit}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          onSaved={() => void edition.reload()}
        />
      ) : null}

      {loading ? <StateMessage variant="loading" /> : null}

      {!loading ? (
        <>
          {showGroupZone ? (
            <section className="border-frame border-frame--md phase-zone">
              <div className="phase-zone__head">
                <h2 style={{ margin: 0 }}>Skupinski del</h2>
                {canEdit && !primaryGroupPhase ? (
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={busy}
                    onClick={() => void ensureGroupPhase()}
                  >
                    + Dodaj skupinski del
                  </button>
                ) : null}
              </div>
              {!primaryGroupPhase ? (
                <p className="muted">
                  Ni skupinske faze. Uporabi format ali jo dodaj.
                </p>
              ) : (
                <GroupStagePanel
                  phase={primaryGroupPhase}
                  editionId={editionId}
                  editionConfiguration={edition.data?.configuration ?? null}
                  canEdit={canEdit}
                  busy={busy}
                  setBusy={setBusy}
                  setError={setError}
                  onReload={load}
                  onDelete={() => void deletePhase(primaryGroupPhase.id)}
                />
              )}
              {extraGroupPhases.length > 0 ? (
                <div className="border-frame border-frame--sm">
                  <p className="muted" style={{ marginTop: 0 }}>
                    Odvečne skupinske faze:
                  </p>
                  <ul className="plain-list">
                    {extraGroupPhases.map((p) => (
                      <li key={p.id} className="knockout-rounds__item">
                        <span>
                          {p.order}. {p.name}
                        </span>
                        {canEdit ? (
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void deletePhase(p.id)}
                          >
                            Odstrani
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {showKnockoutZone ? (
            <section className="border-frame border-frame--md phase-zone">
              <div className="phase-zone__head">
                <h2 style={{ margin: 0 }}>Izločilni del</h2>
              </div>
              <p className="muted" style={{ marginTop: 0 }}>
                Runde so v bazi ločene faze; tukaj so prikazane kot ena
                skupina. Vrstni red lahko še vedno urejaš ročno.
              </p>

              {knockoutPhases.length === 0 ? (
                <p className="muted">Še ni rund — generiraj ogrodje zgoraj.</p>
              ) : (
                <ul className="knockout-rounds plain-list">
                  {knockoutPhases.map((phase, index) => (
                    <li key={phase.id} className="knockout-rounds__item">
                      <div>
                        <strong>
                          {index + 1}. {phase.name}
                        </strong>
                        <span className="muted">
                          {" "}
                          ·{" "}
                          {phase.phase_type === "third_place"
                            ? "za 3. mesto"
                            : "knockout"}
                        </span>
                      </div>
                      {canEdit ? (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy || index === 0}
                            onClick={() => void moveKnockout(phase.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="linkish"
                            disabled={
                              busy || index === knockoutPhases.length - 1
                            }
                            onClick={() => void moveKnockout(phase.id, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => void deletePhase(phase.id)}
                          >
                            Odstrani
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit ? (
                <div className="knockout-presets">
                  <span className="muted">Dodaj rundo ročno:</span>
                  <div className="row-actions" style={{ flexWrap: "wrap" }}>
                    {KNOCKOUT_ROUND_PRESETS.map((preset) => {
                      const already = usedRoundCodes.has(preset.code);
                      return (
                        <button
                          key={preset.code}
                          type="button"
                          className="border-frame border-frame--sm"
                          disabled={busy || already}
                          title={already ? "Že dodano" : undefined}
                          onClick={() => void addKnockoutRound(preset)}
                        >
                          + {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {leaguePhases.length > 0 ? (
            <section className="border-frame border-frame--md phase-zone">
              <h2>Liga</h2>
              <ul className="plain-list">
                {leaguePhases.map((phase) => (
                  <li key={phase.id}>
                    {phase.order}. {phase.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* —— OPERATIONAL BOARD —— */}
          {(primaryGroupPhase || knockoutPhases.length > 0) && (
            <section className="border-frame border-frame--md phase-zone">
              <h2 style={{ margin: 0 }}>Pregled območij</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Dodaj ekipe v skupine / na tekme in generiraj prazne tekme
                (brez ekip).
              </p>
              <PhaseBoard
                key={boardTick}
                editionId={editionId}
                groupPhase={primaryGroupPhase}
                knockoutPhases={knockoutPhases}
                canEdit={canEdit}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
              />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function FormatConfigPanel({
  editionId,
  busy,
  setBusy,
  setError,
  onAfterSave,
  onGenerateStructure,
  onGenerateGroupMatches,
  onFillKnockout,
  forceKnockout,
  setForceKnockout,
  hasGroupPhase,
  hasKnockout,
  hasAnyPhases,
}: {
  editionId: number;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (e: unknown) => void;
  onAfterSave: () => void;
  onGenerateStructure: (replace: boolean) => void;
  onGenerateGroupMatches: (replace: boolean) => void;
  onFillKnockout: (replace: boolean) => void;
  forceKnockout: boolean;
  setForceKnockout: (v: boolean) => void;
  hasGroupPhase: boolean;
  hasKnockout: boolean;
  hasAnyPhases: boolean;
}) {
  const [cfg, setCfg] = useState<FormatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState("4");
  const [teamsPerGroup, setTeamsPerGroup] = useState("4");
  const [advancing, setAdvancing] = useState("2");
  const [bestRunnersUp, setBestRunnersUp] = useState(false);
  const [bestRunnersCount, setBestRunnersCount] = useState("2");
  const [halfDuration, setHalfDuration] = useState("");
  const [halfBreak, setHalfBreak] = useState("");
  const [buffer, setBuffer] = useState("");
  const [thirdPlace, setThirdPlace] = useState(true);
  const [pairing, setPairing] = useState<"auto_cross" | "manual">("auto_cross");

  useEffect(() => {
    let cancelled = false;
    async function loadCfg() {
      setLoading(true);
      try {
        const data = await editionService.getFormatConfig(editionId);
        if (cancelled) return;
        setCfg(data);
        setGroups(String(data.number_of_groups));
        setTeamsPerGroup(String(data.teams_per_group));
        setAdvancing(String(data.teams_advancing_per_group));
        setBestRunnersUp(data.best_runners_up);
        setBestRunnersCount(
          data.number_of_best_runners_up != null
            ? String(data.number_of_best_runners_up)
            : "2",
        );
        setHalfDuration(
          data.half_duration_minutes != null
            ? String(data.half_duration_minutes)
            : "",
        );
        setHalfBreak(
          data.half_time_break_minutes != null
            ? String(data.half_time_break_minutes)
            : "",
        );
        setBuffer(
          data.buffer_between_matches_minutes != null
            ? String(data.buffer_between_matches_minutes)
            : "",
        );
        setThirdPlace(data.has_third_place_match);
        setPairing(data.pairing_method);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadCfg();
    return () => {
      cancelled = true;
    };
  }, [editionId, setError]);

  async function saveConfig() {
    setBusy(true);
    setError(null);
    try {
      const saved = await editionService.updateFormatConfig(editionId, {
        number_of_groups: Number(groups) || 1,
        teams_per_group: Number(teamsPerGroup) || 2,
        teams_advancing_per_group: Number(advancing) || 0,
        best_runners_up: bestRunnersUp,
        number_of_best_runners_up: bestRunnersUp
          ? Number(bestRunnersCount) || 0
          : null,
        half_duration_minutes: halfDuration.trim()
          ? Number(halfDuration)
          : null,
        half_time_break_minutes: halfBreak.trim()
          ? Number(halfBreak)
          : null,
        buffer_between_matches_minutes: buffer.trim()
          ? Number(buffer)
          : null,
        has_third_place_match: thirdPlace,
        pairing_method: pairing,
      });
      setCfg(saved);
      onAfterSave();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const advancingTotal =
    (Number(groups) || 0) * (Number(advancing) || 0) +
    (bestRunnersUp ? Number(bestRunnersCount) || 0 : 0);

  return (
    <section className="border-frame border-frame--md">
      <h2>Nastavitve formata &amp; generator</h2>
      {loading ? (
        <p className="muted">Nalagam config…</p>
      ) : (
        <div className="stack-form group-stage-rules">
          <div className="group-stage-rules__grid">
            <label>
              Št. skupin
              <IntegerStepper
                value={groups}
                min={1}
                max={26}
                emptyMeansNull={false}
                onChange={setGroups}
              />
            </label>
            <label>
              Ekip / skupina
              <IntegerStepper
                value={teamsPerGroup}
                min={2}
                max={20}
                emptyMeansNull={false}
                onChange={setTeamsPerGroup}
              />
            </label>
            <label>
              Napreduje / skupina
              <IntegerStepper
                value={advancing}
                min={0}
                max={Number(teamsPerGroup) || 20}
                emptyMeansNull={false}
                onChange={setAdvancing}
              />
            </label>
            <label>
              Polčas (min)
              <IntegerStepper
                value={halfDuration}
                min={1}
                max={90}
                emptyMeansNull
                onChange={setHalfDuration}
              />
            </label>
            <label>
              Odmor (min)
              <IntegerStepper
                value={halfBreak}
                min={0}
                max={60}
                emptyMeansNull
                onChange={setHalfBreak}
              />
            </label>
            <label>
              Buffer med tekmami (min)
              <IntegerStepper
                value={buffer}
                min={0}
                max={180}
                emptyMeansNull
                onChange={setBuffer}
              />
            </label>
            {bestRunnersUp ? (
              <label>
                Št. najboljših drugih
                <IntegerStepper
                  value={bestRunnersCount}
                  min={1}
                  max={16}
                  emptyMeansNull={false}
                  onChange={setBestRunnersCount}
                />
              </label>
            ) : null}
            <label>
              Parjenje knockout
              <select
                value={pairing}
                onChange={(e) =>
                  setPairing(e.target.value as "auto_cross" | "manual")
                }
              >
                <option value="auto_cross">auto_cross (A1–B2 …)</option>
                <option value="manual">manual (prazni pari)</option>
              </select>
            </label>
          </div>

          <div className="row-actions" style={{ flexWrap: "wrap" }}>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={bestRunnersUp}
                onChange={(e) => setBestRunnersUp(e.target.checked)}
              />
              Najboljši drugi
            </label>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={thirdPlace}
                onChange={(e) => setThirdPlace(e.target.checked)}
              />
              Tekma za 3. mesto
            </label>
          </div>

          <p className="muted">
            Napreduje približno <strong>{advancingTotal}</strong> ekip
            {cfg ? ` (shranjeno: ${cfg.expected_advancing_teams})` : ""}.
          </p>

          <div className="row-actions" style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => void saveConfig()}
            >
              Shrani nastavitve
            </button>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  if (hasAnyPhases) {
                    const ok = window.confirm(
                      "Edicija že ima faze. Zamenjam obstoječe ogrodje (skupine/tekme brez eventov se zbrišejo). Nadaljujem?",
                    );
                    if (!ok) return;
                  }
                  await saveConfig();
                  onGenerateStructure(hasAnyPhases);
                })();
              }}
            >
              Generiraj ogrodje faz
            </button>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy || !hasGroupPhase}
              onClick={() => onGenerateGroupMatches(true)}
            >
              Generiraj tekme (round-robin)
            </button>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={forceKnockout}
                onChange={(e) => setForceKnockout(e.target.checked)}
              />
              Force knockout (tudi če skupine niso končane)
            </label>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy || !hasKnockout}
              onClick={() => onFillKnockout(true)}
            >
              Napolni knockout
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function EditionSportRulesPanel({
  editionId,
  edition,
  canEdit,
  busy,
  setBusy,
  setError,
  onSaved,
}: {
  editionId: number;
  edition: EditionDetail;
  canEdit: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (e: unknown) => void;
  onSaved: () => void;
}) {
  const templates = useAsyncData(
    () => adminTournamentService.listRuleTemplates(),
    [],
  );
  const [templateId, setTemplateId] = useState(
    edition.global_rule_template ? String(edition.global_rule_template.id) : "",
  );
  const [publicRules, setPublicRules] = useState(edition.public_rules || "");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newForm, setNewForm] = useState<NewRuleTemplateFormState>(
    emptyNewRuleTemplateForm,
  );

  useEffect(() => {
    setTemplateId(
      edition.global_rule_template
        ? String(edition.global_rule_template.id)
        : "",
    );
    setPublicRules(edition.public_rules || "");
  }, [edition]);

  const templateList = sortRuleTemplates(templates.data ?? []);
  const selected = templateList.find((t) => String(t.id) === templateId);

  async function saveRules(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await editionService.update(editionId, {
        global_rule_template: templateId ? Number(templateId) : null,
        public_rules: publicRules,
      });
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function createNewTemplate(event: FormEvent) {
    event.preventDefault();
    const payload = toRuleTemplateInput(newForm);
    if (!payload.name) {
      setError(new Error("Vpiši ime novih pravil."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await adminTournamentService.createRuleTemplate(payload);
      templates.reload();
      setTemplateId(String(created.id));
      setPublicRules(created.full_rules_text || payload.full_rules_text || "");
      setShowNewTemplate(false);
      setNewForm(emptyNewRuleTemplateForm());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-frame border-frame--md phase-zone">
      <h2 style={{ margin: 0 }}>Športna pravila (edicija)</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Izberi vgrajeno predlogo ali dodaj svoja nova pravila.
      </p>
      <form className="stack-form" onSubmit={saveRules}>
        <label>
          Predloga pravil
          <select
            value={templateId}
            disabled={!canEdit || busy}
            onChange={(e) => {
              const id = e.target.value;
              setTemplateId(id);
              const tpl = templateList.find((t) => String(t.id) === id);
              if (tpl) {
                setPublicRules(rulesTextForTemplate(tpl));
              }
            }}
          >
            <option value="">— izberi predlogo —</option>
            {templateList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_system ? "" : " (moja)"}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <p className="muted rule-template-preview">
            {[
              selected.match_duration_minutes != null
                ? `${selected.match_duration_minutes} min`
                : null,
              selected.players_per_team != null
                ? `${selected.players_per_team} igralcev`
                : null,
              selected.offside_rule ? "offside" : null,
              selected.description || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <label>
          Besedilo pravil
          <textarea
            value={publicRules}
            disabled={!canEdit || busy}
            onChange={(e) => setPublicRules(e.target.value)}
            rows={6}
            placeholder="Besedilo iz predloge ali lastno…"
          />
        </label>
        {canEdit ? (
          <div className="row-actions">
            <button
              type="submit"
              className="border-frame border-frame--sm"
              disabled={busy}
            >
              Shrani športna pravila
            </button>
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              disabled={busy}
              onClick={() => setShowNewTemplate((v) => !v)}
            >
              {showNewTemplate ? "Skrij novo" : "Dodaj nova pravila"}
            </button>
          </div>
        ) : null}
      </form>

      {canEdit && showNewTemplate ? (
        <form
          className="stack-form"
          style={{ marginTop: "0.75rem" }}
          onSubmit={(e) => void createNewTemplate(e)}
        >
          <h3 style={{ margin: 0 }}>Nova predloga pravil</h3>
          <NewRuleTemplateFormFields
            value={newForm}
            onChange={setNewForm}
            disabled={busy}
          />
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={busy || !newForm.name.trim()}
          >
            Ustvari predlogo
          </button>
        </form>
      ) : null}
    </section>
  );
}

function GroupStagePanel({
  phase,
  editionId,
  editionConfiguration,
  canEdit,
  busy,
  setBusy,
  setError,
  onReload,
  onDelete,
}: {
  phase: PhaseListItem;
  editionId: number;
  editionConfiguration: Record<string, unknown> | null;
  canEdit: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (e: unknown) => void;
  onReload: () => Promise<void>;
  onDelete: () => void;
}) {
  const cfg = (phase.config ?? {}) as Record<string, unknown>;
  const initialAdv = parseAdvancement(cfg);

  const [numberOfGroups, setNumberOfGroups] = useState(
    String(asNum(cfg, "number_of_groups", 4)),
  );
  const [teamsPerGroup, setTeamsPerGroup] = useState(
    String(asNum(cfg, "teams_per_group", 4)),
  );
  const [advMode, setAdvMode] = useState<AdvancementMode>(initialAdv.mode);
  const [perGroup, setPerGroup] = useState(String(initialAdv.perGroup));
  const [autoPlaces, setAutoPlaces] = useState(String(initialAdv.autoPlaces));
  const [wildcardPlace, setWildcardPlace] = useState(
    String(initialAdv.wildcardPlace),
  );
  const [wildcardCount, setWildcardCount] = useState(
    String(initialAdv.wildcardCount),
  );
  const [pointsWin, setPointsWin] = useState(
    String(asNum(cfg, "points_for_win", 3)),
  );
  const [pointsDraw, setPointsDraw] = useState(
    String(asNum(cfg, "points_for_draw", 1)),
  );
  const [replaceGroups, setReplaceGroups] = useState(false);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [editingNames, setEditingNames] = useState<Record<number, string>>({});

  const advancement: AdvancementState = {
    mode: advMode,
    perGroup: Number(perGroup) || 0,
    autoPlaces: Number(autoPlaces) || 0,
    wildcardPlace: Number(wildcardPlace) || 2,
    wildcardCount: Number(wildcardCount) || 0,
  };

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const page = await groupService.list({
        tournament_phase: phase.id,
        ordering: "order",
        page_size: 50,
      });
      setGroups(page.results);
      setEditingNames(
        Object.fromEntries(page.results.map((g) => [g.id, g.name])),
      );
    } catch (err) {
      setError(err);
    } finally {
      setGroupsLoading(false);
    }
  }, [phase.id, setError]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    const next = parseAdvancement(cfg);
    setNumberOfGroups(String(asNum(cfg, "number_of_groups", 4)));
    setTeamsPerGroup(String(asNum(cfg, "teams_per_group", 4)));
    setAdvMode(next.mode);
    setPerGroup(String(next.perGroup));
    setAutoPlaces(String(next.autoPlaces));
    setWildcardPlace(String(next.wildcardPlace));
    setWildcardCount(String(next.wildcardCount));
    setPointsWin(String(asNum(cfg, "points_for_win", 3)));
    setPointsDraw(String(asNum(cfg, "points_for_draw", 1)));
  }, [phase.id, phase.config]);

  async function renameGroup(groupId: number) {
    const name = (editingNames[groupId] ?? "").trim();
    if (!name) {
      setError(new Error("Ime skupine ne sme biti prazno."));
      return;
    }
    const current = groups.find((g) => g.id === groupId);
    if (current && current.name === name) return;
    setBusy(true);
    setError(null);
    try {
      await groupService.update(groupId, { name });
      await loadGroups();
      await onReload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(groupId: number) {
    const ok = window.confirm(
      "Izbrišem to skupino (z ekipami in tekmami v njej)?",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await groupService.delete(groupId);
      await loadGroups();
      await onReload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function buildConfig() {
    return {
      ...(phase.config ?? {}),
      number_of_groups: Number(numberOfGroups),
      teams_per_group: Number(teamsPerGroup),
      teams_advancing_per_group:
        advMode === "per_group" ? Number(perGroup) : Number(autoPlaces),
      advancement: advancementToConfig(advancement),
      points_for_win: Number(pointsWin),
      points_for_draw: Number(pointsDraw),
      ranking_criteria:
        (phase.config?.ranking_criteria as string[]) ??
        DEFAULT_GROUP_CONFIG.ranking_criteria,
    };
  }

  async function saveRules(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const structureConfig = buildConfig();
      await phaseService.update(phase.id, { config: structureConfig });
      // Mirror structure rules onto the edition entity
      await editionService.update(editionId, {
        configuration: {
          ...(editionConfiguration ?? {}),
          group_stage: structureConfig,
        },
      });
      await onReload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function generateGroups() {
    setBusy(true);
    setError(null);
    try {
      const structureConfig = buildConfig();
      await phaseService.update(phase.id, { config: structureConfig });
      await editionService.update(editionId, {
        configuration: {
          ...(editionConfiguration ?? {}),
          group_stage: structureConfig,
        },
      });
      await phaseService.generateGroups(phase.id, {
        number_of_groups: Number(numberOfGroups),
        max_teams: Number(teamsPerGroup) || null,
        replace: replaceGroups,
      });
      await loadGroups();
      await onReload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const groupCount = Number(numberOfGroups) || 0;

  return (
    <div className="group-stage-panel">
      <div className="phase-zone__head" style={{ marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Nastavitve in skupine</h3>
        {canEdit ? (
          <button
            type="button"
            className="linkish"
            disabled={busy}
            onClick={onDelete}
          >
            Odstrani fazo
          </button>
        ) : null}
      </div>

      <form className="stack-form group-stage-rules" onSubmit={saveRules}>
        <div className="group-stage-rules__grid">
          <label>
            Število skupin
            <IntegerStepper
              value={numberOfGroups}
              onChange={setNumberOfGroups}
              min={1}
              max={26}
              emptyMeansNull={false}
            />
          </label>
          <label>
            Ekip na skupino
            <IntegerStepper
              value={teamsPerGroup}
              onChange={setTeamsPerGroup}
              min={2}
              max={20}
              emptyMeansNull={false}
            />
          </label>
          <label>
            Točke za zmago
            <IntegerStepper
              value={pointsWin}
              onChange={setPointsWin}
              min={0}
              max={10}
              emptyMeansNull={false}
            />
          </label>
          <label>
            Točke za remi
            <IntegerStepper
              value={pointsDraw}
              onChange={setPointsDraw}
              min={0}
              max={10}
              emptyMeansNull={false}
            />
          </label>
        </div>

        <fieldset className="advancement-fieldset">
          <legend>Napredovanje v knockout</legend>
          <label>
            Način
            <select
              value={advMode}
              onChange={(e) => setAdvMode(e.target.value as AdvancementMode)}
              disabled={!canEdit}
            >
              <option value="per_group">
                Fiksno iz vsake skupine (npr. 2 iz vsake)
              </option>
              <option value="best_of_place">
                Najboljši + najboljši z mesta (npr. 1. + 2 najboljša 2.)
              </option>
            </select>
          </label>

          {advMode === "per_group" ? (
            <div className="group-stage-rules__grid">
              <label>
                Ekip iz vsake skupine
                <IntegerStepper
                  value={perGroup}
                  onChange={setPerGroup}
                  min={0}
                  max={10}
                  emptyMeansNull={false}
                />
              </label>
            </div>
          ) : (
            <div className="group-stage-rules__grid">
              <label>
                Avtomatsko mesta (iz vsake)
                <IntegerStepper
                  value={autoPlaces}
                  onChange={setAutoPlaces}
                  min={1}
                  max={5}
                  emptyMeansNull={false}
                />
              </label>
              <label>
                Primerjaj mesto
                <IntegerStepper
                  value={wildcardPlace}
                  onChange={setWildcardPlace}
                  min={2}
                  max={8}
                  emptyMeansNull={false}
                />
              </label>
              <label>
                Koliko najboljših s tega mesta
                <IntegerStepper
                  value={wildcardCount}
                  onChange={setWildcardCount}
                  min={0}
                  max={16}
                  emptyMeansNull={false}
                />
              </label>
            </div>
          )}

          <p className="muted advancement-summary">
            {describeAdvancement(groupCount, advancement)}.
          </p>
        </fieldset>

        {canEdit ? (
          <div className="row-actions" style={{ flexWrap: "wrap" }}>
            <button
              type="submit"
              className="border-frame border-frame--sm"
              disabled={busy}
            >
              Shrani pravila
            </button>
            <label className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={replaceGroups}
                onChange={(e) => setReplaceGroups(e.target.checked)}
              />
              Zamenjaj obstoječe skupine
            </label>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => void generateGroups()}
            >
              Generiraj skupine ({numberOfGroups})
            </button>
          </div>
        ) : null}
      </form>

      <div className="group-list">
        <h4 style={{ marginBottom: "0.35rem" }}>
          Skupine ({groups.length})
        </h4>
        {groupsLoading ? <p className="muted">Nalagam…</p> : null}
        {!groupsLoading && groups.length === 0 ? (
          <p className="muted">Še ni skupin — generiraj jih zgoraj.</p>
        ) : null}
        <ul className="plain-list">
          {groups.map((g) => (
            <li key={g.id} className="group-list__item">
              {canEdit ? (
                <input
                  className="group-list__name"
                  value={editingNames[g.id] ?? g.name}
                  disabled={busy}
                  onChange={(e) =>
                    setEditingNames((prev) => ({
                      ...prev,
                      [g.id]: e.target.value,
                    }))
                  }
                  onBlur={() => void renameGroup(g.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  aria-label="Ime skupine"
                />
              ) : (
                <strong>{g.name}</strong>
              )}
              {g.max_teams != null ? (
                <span className="muted">max {g.max_teams}</span>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="linkish"
                  disabled={busy}
                  onClick={() => void deleteGroup(g.id)}
                >
                  Odstrani
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PhaseBoard({
  editionId,
  groupPhase,
  knockoutPhases,
  canEdit,
  busy,
  setBusy,
  setError,
}: {
  editionId: number;
  groupPhase: PhaseListItem | null;
  knockoutPhases: PhaseListItem[];
  canEdit: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (e: unknown) => void;
}) {
  const [participations, setParticipations] = useState<
    TeamParticipationListItem[]
  >([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [groupTeams, setGroupTeams] = useState<GroupTeamItem[]>([]);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const parts = await teamParticipationService.list({
        tournament_edition: editionId,
        page_size: 200,
      });
      setParticipations(parts.results);

      if (groupPhase) {
        const gPage = await groupService.list({
          tournament_phase: groupPhase.id,
          ordering: "order",
          page_size: 50,
        });
        setGroups(gPage.results);
        const gtPage = await groupTeamService.list({
          page_size: 500,
        });
        const groupIds = new Set(gPage.results.map((g) => g.id));
        setGroupTeams(
          gtPage.results.filter((gt) =>
            groupIds.has(gt.tournament_phase_group),
          ),
        );
      } else {
        setGroups([]);
        setGroupTeams([]);
      }

      const phaseIds = [
        ...(groupPhase ? [groupPhase.id] : []),
        ...knockoutPhases.map((p) => p.id),
      ];
      if (phaseIds.length) {
        const pages = await Promise.all(
          phaseIds.map((phaseId) =>
            matchService.list({
              tournament_phase: phaseId,
              page_size: 500,
              ordering: "match_number",
            }),
          ),
        );
        setMatches(pages.flatMap((p) => p.results));
      } else {
        setMatches([]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId, groupPhase, knockoutPhases, setError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const assignedInGroups = useMemo(
    () => new Set(groupTeams.map((gt) => gt.team_participation)),
    [groupTeams],
  );

  async function addTeamToGroup(groupId: number, participationId: number) {
    if (!participationId) return;
    setBusy(true);
    setError(null);
    try {
      await groupTeamService.create({
        tournament_phase_group: groupId,
        team_participation: participationId,
      });
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeGroupTeam(id: number) {
    setBusy(true);
    setError(null);
    try {
      await groupTeamService.delete(id);
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function renameBoardGroup(groupId: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = groups.find((g) => g.id === groupId);
    if (current && current.name === trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await groupService.update(groupId, { name: trimmed });
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBoardGroup(groupId: number) {
    const ok = window.confirm(
      "Izbrišem to skupino (z ekipami in tekmami v njej)?",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await groupService.delete(groupId);
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function generatePhaseMatches(phaseId: number) {
    setBusy(true);
    setError(null);
    try {
      // Backend fills missing TBD slots; keeps matches that already have teams.
      await phaseService.generateMatches(phaseId, { replace: false });
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatch(matchId: number) {
    const ok = window.confirm("Izbrišem to tekmo?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await matchService.delete(matchId);
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function assignMatchTeam(
    matchId: number,
    side: "home" | "away",
    participationId: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      const value = participationId ? Number(participationId) : null;
      if (side === "home") {
        await matchService.update(matchId, {
          home_team_participation: value,
        });
      } else {
        await matchService.update(matchId, {
          away_team_participation: value,
        });
      }
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function assignMatchTime(matchId: number, time: string) {
    setBusy(true);
    setError(null);
    try {
      await matchService.update(matchId, {
        match_date: matchDateFromTime(time),
      });
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <StateMessage variant="loading" />;

  return (
    <div className="phase-board">
      {groupPhase ? (
        <div className="phase-board__zone">
          <div className="phase-zone__head">
            <h3 style={{ margin: 0 }}>Skupine</h3>
            {canEdit ? (
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy || groups.length === 0}
                onClick={() => void generatePhaseMatches(groupPhase.id)}
              >
                Generiraj tekme (prazne)
              </button>
            ) : null}
          </div>
          {groups.length === 0 ? (
            <p className="muted">Najprej generiraj skupine zgoraj.</p>
          ) : (
            <div className="phase-board__groups">
              {groups.map((group) => {
                const teams = groupTeams.filter(
                  (gt) => gt.tournament_phase_group === group.id,
                );
                const groupMatches = matches.filter(
                  (m) => m.tournament_phase_group === group.id,
                );
                return (
                  <div
                    key={group.id}
                    className="phase-board__card border-frame border-frame--sm"
                  >
                    <div className="phase-board__card-head">
                      {canEdit ? (
                        <input
                          className="group-list__name"
                          defaultValue={group.name}
                          disabled={busy}
                          onBlur={(e) =>
                            void renameBoardGroup(group.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          aria-label="Ime skupine"
                        />
                      ) : (
                        <h4 style={{ margin: 0 }}>{group.name}</h4>
                      )}
                      {canEdit ? (
                        <button
                          type="button"
                          className="linkish"
                          disabled={busy}
                          onClick={() => void deleteBoardGroup(group.id)}
                        >
                          Odstrani
                        </button>
                      ) : null}
                    </div>
                    <ul className="plain-list">
                      {teams.map((gt) => (
                        <li key={gt.id} className="knockout-rounds__item">
                          <span>{gt.participation_name}</span>
                          {canEdit ? (
                            <button
                              type="button"
                              className="linkish"
                              disabled={busy}
                              onClick={() => void removeGroupTeam(gt.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {canEdit ? (
                      <label>
                        + Ekipa
                        <select
                          defaultValue=""
                          disabled={busy}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            e.target.value = "";
                            if (v) void addTeamToGroup(group.id, v);
                          }}
                        >
                          <option value="">Izberi…</option>
                          {participations
                            .filter((p) => !assignedInGroups.has(p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.participation_name || p.team.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}

                    <div className="phase-board__group-matches">
                      <strong style={{ fontSize: "0.95rem" }}>
                        Tekme ({groupMatches.length})
                      </strong>
                      {groupMatches.length === 0 ? (
                        <p className="muted" style={{ margin: 0 }}>
                          Še ni tekem.
                        </p>
                      ) : (
                        <ul className="plain-list phase-board__matches">
                          {groupMatches
                            .slice()
                            .sort(
                              (a, b) =>
                                (a.match_number ?? 0) - (b.match_number ?? 0),
                            )
                            .map((m) => (
                              <li key={m.id} className="phase-board__match">
                                <span className="muted">
                                  #{m.match_number ?? "—"}
                                </span>
                                {canEdit ? (
                                  <>
                                    <select
                                      value={m.home_team_participation ?? ""}
                                      disabled={busy}
                                      onChange={(e) =>
                                        void assignMatchTeam(
                                          m.id,
                                          "home",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="">TBD</option>
                                      {teams.map((gt) => (
                                        <option
                                          key={gt.id}
                                          value={gt.team_participation}
                                        >
                                          {gt.participation_name}
                                        </option>
                                      ))}
                                    </select>
                                    <span>vs</span>
                                    <select
                                      value={m.away_team_participation ?? ""}
                                      disabled={busy}
                                      onChange={(e) =>
                                        void assignMatchTeam(
                                          m.id,
                                          "away",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="">TBD</option>
                                      {teams.map((gt) => (
                                        <option
                                          key={gt.id}
                                          value={gt.team_participation}
                                        >
                                          {gt.participation_name}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="time"
                                      className="phase-board__match-time"
                                      value={timeFromMatchDate(m.match_date)}
                                      disabled={busy}
                                      title="Začetek"
                                      aria-label="Začetek"
                                      onChange={(e) =>
                                        void assignMatchTime(m.id, e.target.value)
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="linkish"
                                      disabled={busy}
                                      onClick={() => void deleteMatch(m.id)}
                                    >
                                      Odstrani
                                    </button>
                                  </>
                                ) : (
                                  <span>
                                    {m.home_team_name ?? "TBD"} vs{" "}
                                    {m.away_team_name ?? "TBD"}
                                    {timeFromMatchDate(m.match_date)
                                      ? ` · ${timeFromMatchDate(m.match_date)}`
                                      : ""}
                                  </span>
                                )}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {knockoutPhases.map((phase) => {
        const phaseMatches = matches
          .filter((m) => m.tournament_phase === phase.id)
          .sort(
            (a, b) => (a.match_number ?? 0) - (b.match_number ?? 0),
          );
        return (
          <div key={phase.id} className="phase-board__zone">
            <div className="phase-zone__head">
              <h3 style={{ margin: 0 }}>{phase.name}</h3>
              {canEdit ? (
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={busy}
                  onClick={() => void generatePhaseMatches(phase.id)}
                >
                  Generiraj tekme (prazne)
                </button>
              ) : null}
            </div>
            {phaseMatches.length === 0 ? (
              <p className="muted">Še ni tekem — klikni generiraj.</p>
            ) : (
              <ul className="plain-list phase-board__matches">
                {phaseMatches.map((m) => (
                  <li key={m.id} className="phase-board__match">
                    <span className="muted">#{m.match_number ?? "—"}</span>
                    {canEdit ? (
                      <>
                        <select
                          value={m.home_team_participation ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            void assignMatchTeam(
                              m.id,
                              "home",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">TBD</option>
                          {participations.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.participation_name || p.team.name}
                            </option>
                          ))}
                        </select>
                        <span>vs</span>
                        <select
                          value={m.away_team_participation ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            void assignMatchTeam(
                              m.id,
                              "away",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">TBD</option>
                          {participations.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.participation_name || p.team.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          className="phase-board__match-time"
                          value={timeFromMatchDate(m.match_date)}
                          disabled={busy}
                          title="Začetek"
                          aria-label="Začetek"
                          onChange={(e) =>
                            void assignMatchTime(m.id, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="linkish"
                          disabled={busy}
                          onClick={() => void deleteMatch(m.id)}
                        >
                          Odstrani
                        </button>
                      </>
                    ) : (
                      <span>
                        {m.home_team_name ?? "TBD"} vs{" "}
                        {m.away_team_name ?? "TBD"}
                        {timeFromMatchDate(m.match_date)
                          ? ` · ${timeFromMatchDate(m.match_date)}`
                          : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
