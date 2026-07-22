import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { formatPersonName } from "@/shared/utils/format";
import {
  playerService,
  type PlayerListItem,
} from "@/modules/players/services/playerService";
import {
  editionService,
  type FinishAwardCatalogItem,
  type FinishStandingRow,
} from "../services/editionService";

const PRIZE_TYPES = [
  "money",
  "trophy",
  "voucher",
  "dinner",
  "physical_gift",
  "other",
] as const;

type AwardFormRow = {
  award_id: string;
  player_id: string;
  notes: string;
  with_prize: boolean;
  prize_type: string;
  prize_value: string;
  prize_description: string;
  sponsor_id: string;
};

function emptyAwardRow(awardId = ""): AwardFormRow {
  return {
    award_id: awardId,
    player_id: "",
    notes: "",
    with_prize: false,
    prize_type: "trophy",
    prize_value: "",
    prize_description: "",
    sponsor_id: "",
  };
}

/** Demo generator used to append MMDD-HHMM; hide it in UI. */
function displayTeamName(name: string | null | undefined, fallbackId?: number) {
  if (!name) return fallbackId != null ? `#${fallbackId}` : "—";
  return name.replace(/\s+\d{4}-\d{4}$/, "");
}

function toAwardEntryPayload(rows: AwardFormRow[]) {
  return rows
    .filter((r) => r.player_id && r.award_id)
    .map((r) => ({
      award_id: Number(r.award_id),
      player_id: Number(r.player_id),
      notes: r.notes,
      prize: r.with_prize
        ? {
            prize_type: r.prize_type,
            recipient_type: "player" as const,
            value: r.prize_value.trim() === "" ? null : r.prize_value,
            description: r.prize_description,
            sponsor_id: r.sponsor_id ? Number(r.sponsor_id) : null,
          }
        : null,
    }));
}

export function EditionFinishPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, isAdmin } = useAuth();

  const preview = useAsyncData(
    () => editionService.finishPreview(editionId),
    [editionId],
  );

  const [standings, setStandings] = useState<FinishStandingRow[]>([]);
  const [awardRows, setAwardRows] = useState<AwardFormRow[]>([]);
  const [awardsCatalog, setAwardsCatalog] = useState<FinishAwardCatalogItem[]>(
    [],
  );
  const [criteriaOrder, setCriteriaOrder] = useState<string[]>([]);
  const [criteriaToAdd, setCriteriaToAdd] = useState("");
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false);
  const [showStandingsEditor, setShowStandingsEditor] = useState(false);
  const [editingAwardIndex, setEditingAwardIndex] = useState<number | null>(
    null,
  );
  const [draftAward, setDraftAward] = useState<AwardFormRow>(emptyAwardRow());
  const [creatingNewAwardType, setCreatingNewAwardType] = useState(false);
  const [newAwardName, setNewAwardName] = useState("");
  const [newAwardDescription, setNewAwardDescription] = useState("");
  const [playerOptions, setPlayerOptions] = useState<PlayerListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [criteriaBusy, setCriteriaBusy] = useState(false);
  const [standingsBusy, setStandingsBusy] = useState(false);
  const [awardsBusy, setAwardsBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!preview.data) return;
    setStandings(preview.data.proposed_standings.map((r) => ({ ...r })));
    setAwardsCatalog(preview.data.awards_catalog);
    setCriteriaOrder([...preview.data.ranking_criteria]);
    setAwardRows(
      preview.data.award_entries.map((e) => ({
        award_id: e.award_id ? String(e.award_id) : "",
        player_id: String(e.player_id),
        notes: e.notes || "",
        with_prize: Boolean(e.prize),
        prize_type: e.prize?.prize_type || "trophy",
        prize_value: e.prize?.value != null ? String(e.prize.value) : "",
        prize_description: e.prize?.description || "",
        sponsor_id: e.prize?.sponsor_id ? String(e.prize.sponsor_id) : "",
      })),
    );
  }, [preview.data]);

  useEffect(() => {
    let cancelled = false;
    void playerService.list({ page_size: 100 }).then((page) => {
      if (!cancelled) setPlayerOptions(page.results ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const criteriaCatalog = preview.data?.ranking_criteria_catalog ?? [];
  const criteriaLabel = useMemo(() => {
    const map = new Map(criteriaCatalog.map((c) => [c.code, c.label]));
    return (code: string) => map.get(code) ?? code;
  }, [criteriaCatalog]);

  const unusedCriteria = criteriaCatalog.filter(
    (c) => !criteriaOrder.includes(c.code),
  );

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven ID edicije." />;
  }

  const canEdit =
    isAdmin ||
    hasPermission("edition.manage", editionId) ||
    hasPermission("edition.edit", editionId);

  function moveStanding(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= standings.length) return;
    setStandings((rows) => {
      const copy = [...rows];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy.map((r, i) => ({ ...r, position: i + 1 }));
    });
  }

  function moveCriterion(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= criteriaOrder.length) return;
    setCriteriaOrder((rows) => {
      const copy = [...rows];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  }

  function addCriterion() {
    if (!criteriaToAdd || criteriaOrder.includes(criteriaToAdd)) return;
    setCriteriaOrder((rows) => [...rows, criteriaToAdd]);
    setCriteriaToAdd("");
  }

  function startEditAward(index: number) {
    const row = awardRows[index];
    if (!row) return;
    setEditingAwardIndex(index);
    setDraftAward({ ...row });
    setCreatingNewAwardType(false);
    setNewAwardName("");
    setNewAwardDescription("");
  }

  function cancelAwardForm() {
    setEditingAwardIndex(null);
    setDraftAward(emptyAwardRow());
    setCreatingNewAwardType(false);
    setNewAwardName("");
    setNewAwardDescription("");
  }

  async function saveCriteria() {
    setCriteriaBusy(true);
    setError(null);
    try {
      await editionService.updateFormatConfig(editionId, {
        ranking_criteria: criteriaOrder,
      });
      preview.reload();
      setShowCriteriaEditor(false);
    } catch (err) {
      setError(err);
    } finally {
      setCriteriaBusy(false);
    }
  }

  async function saveStandingsOnly() {
    setStandingsBusy(true);
    setError(null);
    try {
      await editionService.saveStandings(
        editionId,
        standings.map((r) => ({
          team_participation_id: r.team_participation_id,
          position: Number(r.position),
          qualification: r.qualification || "",
          notes: r.notes || "",
        })),
      );
      preview.reload();
      setShowStandingsEditor(false);
    } catch (err) {
      setError(err);
    } finally {
      setStandingsBusy(false);
    }
  }

  function refreshStandingsFromProposal() {
    if (!preview.data) return;
    setStandings(preview.data.proposed_standings.map((r) => ({ ...r })));
  }

  async function ensureAwardTypeId(): Promise<string | null> {
    if (draftAward.award_id) return draftAward.award_id;
    const name = newAwardName.trim();
    if (!creatingNewAwardType || !name) return null;
    const award = await editionService.createAward({
      name,
      description: newAwardDescription.trim() || undefined,
    });
    setAwardsCatalog((list) =>
      [...list.filter((a) => a.id !== award.id), award].sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      ),
    );
    setNewAwardName("");
    setNewAwardDescription("");
    setCreatingNewAwardType(false);
    return String(award.id);
  }

  async function persistAwards(rows: AwardFormRow[]) {
    setAwardsBusy(true);
    setError(null);
    try {
      await editionService.saveAwards(editionId, toAwardEntryPayload(rows));
      preview.reload();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setAwardsBusy(false);
    }
  }

  async function submitAwardForm() {
    setBusy(true);
    setError(null);
    try {
      const awardId = await ensureAwardTypeId();
      if (!awardId || !draftAward.player_id) {
        throw new Error("Izberi nagrado in igralca (ali ustvari novo nagrado).");
      }
      const nextRow = { ...draftAward, award_id: awardId };
      const nextRows =
        editingAwardIndex != null
          ? awardRows.map((r, i) =>
              i === editingAwardIndex ? nextRow : r,
            )
          : [...awardRows, nextRow];
      setAwardRows(nextRows);
      await persistAwards(nextRows);
      cancelAwardForm();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function removeAwardRow(index: number) {
    if (editingAwardIndex === index) cancelAwardForm();
    const nextRows = awardRows.filter((_, i) => i !== index);
    setAwardRows(nextRows);
    setBusy(true);
    try {
      await persistAwards(nextRows);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onFinish() {
    setBusy(true);
    setError(null);
    try {
      await editionService.finish(editionId, {
        standings: standings.map((r) => ({
          team_participation_id: r.team_participation_id,
          position: Number(r.position),
          qualification: r.qualification || "",
          notes: r.notes || "",
        })),
        award_entries: toAwardEntryPayload(awardRows),
      });
      setDone(true);
      preview.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const data = preview.data;

  return (
    <div className="page">
      <PageHeader
        title="Zaključek turnirja"
        subtitle={
          data
            ? `${data.edition_name} · ${data.status.name ?? data.status.code}`
            : "Pregled rezultatov in zaključek edicije"
        }
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            Nazaj
          </Link>
        }
      />

      <ErrorBanner error={preview.error ?? error} />
      {preview.loading ? <StateMessage variant="loading" /> : null}

      {data ? (
        <>
          <section className="border-frame border-frame--md">
            <h2>Preverjanje tekem</h2>
            {data.can_finish ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Vse tekme so končane ali preklicane — zaključek je mogoč.
              </p>
            ) : (
              <>
                <p className="muted">
                  Še neodigrane tekme (zaključek onemogočen):
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tekma</th>
                      <th>Faza</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unfinished_matches.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link to={`/matches/${m.id}`}>
                            {displayTeamName(m.home)} –{" "}
                            {displayTeamName(m.away)}
                          </Link>
                        </td>
                        <td>{m.phase_name ?? "—"}</td>
                        <td>{m.status_name ?? m.status_code ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <div
              className="row-actions"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Kriteriji razvrščanja</h2>
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={!canEdit || criteriaBusy}
                onClick={() => setShowCriteriaEditor((v) => !v)}
              >
                {showCriteriaEditor ? "Zapri" : "Uredi"}
              </button>
            </div>
            {!showCriteriaEditor ? (
              <ol className="plain-list" style={{ marginBottom: 0 }}>
                {criteriaOrder.map((code) => (
                  <li key={code}>{criteriaLabel(code)}</li>
                ))}
              </ol>
            ) : (
              <div className="stack-form">
                <p className="muted">
                  Vrstni red = prioriteta. Dodaj iz predloge, nato shrani.
                </p>
                <ul className="plain-list finish-criteria-list">
                  {criteriaOrder.map((code, index) => (
                    <li key={code} className="finish-criteria-row">
                      <span>
                        {index + 1}. {criteriaLabel(code)}
                      </span>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="border-frame border-frame--sm"
                          disabled={criteriaBusy || index === 0}
                          onClick={() => moveCriterion(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="border-frame border-frame--sm"
                          disabled={
                            criteriaBusy || index === criteriaOrder.length - 1
                          }
                          onClick={() => moveCriterion(index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="border-frame border-frame--sm"
                          disabled={criteriaBusy}
                          onClick={() =>
                            setCriteriaOrder((rows) =>
                              rows.filter((c) => c !== code),
                            )
                          }
                        >
                          Odstrani
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="row-actions row-actions--fields">
                  <label>
                    Dodaj kriterij
                    <select
                      value={criteriaToAdd}
                      disabled={!canEdit || criteriaBusy}
                      onChange={(e) => setCriteriaToAdd(e.target.value)}
                    >
                      <option value="">— izberi iz predloge —</option>
                      {unusedCriteria.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={!canEdit || criteriaBusy || !criteriaToAdd}
                    onClick={addCriterion}
                  >
                    Dodaj
                  </button>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={
                      !canEdit || criteriaBusy || criteriaOrder.length === 0
                    }
                    onClick={() => void saveCriteria()}
                  >
                    {criteriaBusy ? "Shranjujem…" : "Shrani kriterije"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Skupinske lestvice</h2>
            <p className="muted">
              Stolpci: tekme · zmage · neodločeno · porazi · goli (zadeti:prejeti)
              · gol razlika · točke.
            </p>
            {data.group_standings.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Ni skupinskega dela.
              </p>
            ) : (
              data.group_standings.map((table) => (
                <div key={table.group_id} style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ marginBottom: "0.5rem" }}>
                    {table.group_name}
                    <span className="muted"> · {table.phase_name}</span>
                  </h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Ekipa</th>
                        <th title="Tekme">Tekme</th>
                        <th title="Zmage">Z</th>
                        <th title="Neodločeno">N</th>
                        <th title="Porazi">P</th>
                        <th title="Goli zadeti:prejeti">Goli</th>
                        <th title="Gol razlika">+/−</th>
                        <th>Točke</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={row.team_participation_id}>
                          <td>{row.position}</td>
                          <td>
                            {displayTeamName(
                              row.team_name,
                              row.team_participation_id,
                            )}
                          </td>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          <td>{row.draws}</td>
                          <td>{row.losses}</td>
                          <td>
                            {row.goals_for}:{row.goals_against}
                          </td>
                          <td>{row.goal_difference}</td>
                          <td>
                            <strong>{row.points}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Knockout tekme</h2>
            {data.knockout_matches.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Ni knockout tekem.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Faza</th>
                    <th>Tekma</th>
                    <th>Rezultat</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.knockout_matches.map((m) => (
                    <tr key={m.id}>
                      <td>{m.phase_name ?? "—"}</td>
                      <td>
                        <Link to={`/matches/${m.id}`}>
                          {displayTeamName(m.home)} – {displayTeamName(m.away)}
                        </Link>
                      </td>
                      <td>{m.score ?? "—"}</td>
                      <td>{m.status_name ?? m.status_code ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <div
              className="row-actions"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Končna lestvica</h2>
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={!canEdit || standingsBusy}
                onClick={() => setShowStandingsEditor((v) => !v)}
              >
                {showStandingsEditor ? "Zapri" : "Uredi"}
              </button>
            </div>
            {!showStandingsEditor ? (
              <ol className="plain-list" style={{ marginBottom: 0 }}>
                {standings.map((row) => (
                  <li key={row.team_participation_id}>
                    {displayTeamName(
                      row.team_name,
                      row.team_participation_id,
                    )}
                    {row.qualification ? (
                      <span className="muted"> · {row.qualification}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="stack-form">
                <p className="muted">
                  Predlog iz finala / 3. mesta. Preuredi vrstni red, shrani.
                </p>
                <div className="finish-standings-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Ekipa</th>
                        <th>Oznaka</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, index) => (
                        <tr key={row.team_participation_id}>
                          <td>{row.position}</td>
                          <td>
                            {displayTeamName(
                              row.team_name,
                              row.team_participation_id,
                            )}
                          </td>
                          <td>
                            <label style={{ display: "block", margin: 0 }}>
                              <input
                                value={row.qualification ?? ""}
                                disabled={standingsBusy || !canEdit}
                                placeholder="npr. Champion"
                                onChange={(e) =>
                                  setStandings((rows) =>
                                    rows.map((r, i) =>
                                      i === index
                                        ? {
                                            ...r,
                                            qualification: e.target.value,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                            </label>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="border-frame border-frame--sm"
                                disabled={standingsBusy || index === 0}
                                onClick={() => moveStanding(index, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="border-frame border-frame--sm"
                                disabled={
                                  standingsBusy ||
                                  index === standings.length - 1
                                }
                                onClick={() => moveStanding(index, 1)}
                              >
                                ↓
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={!canEdit || standingsBusy}
                    onClick={refreshStandingsFromProposal}
                  >
                    Osveži iz rezultatov
                  </button>
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={
                      !canEdit || standingsBusy || standings.length === 0
                    }
                    onClick={() => void saveStandingsOnly()}
                  >
                    {standingsBusy ? "Shranjujem…" : "Shrani"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Nagrade</h2>
            <p className="muted">
              Seznam dodeljenih nagrad. Uredi ali dodaj novo spodaj.
            </p>
            <div className="stack-form">
              {awardRows.length === 0 ? (
                <p className="muted">Še ni dodeljenih nagrad.</p>
              ) : null}
              {awardRows.map((row, index) => {
                const awardName =
                  awardsCatalog.find((a) => String(a.id) === row.award_id)
                    ?.name ?? `#${row.award_id}`;
                const player = playerOptions.find(
                  (p) => String(p.id) === row.player_id,
                );
                const playerName = player
                  ? formatPersonName(player.person)
                  : `#${row.player_id}`;
                return (
                  <div
                    key={`${row.award_id}-${row.player_id}-${index}`}
                    className="finish-criteria-row"
                  >
                    <span>
                      <strong>{awardName}</strong> → {playerName}
                      {row.with_prize
                        ? ` · sklad: ${row.prize_type}${row.prize_value ? ` (${row.prize_value})` : ""}`
                        : ""}
                      {row.notes ? (
                        <span className="muted"> · {row.notes}</span>
                      ) : null}
                    </span>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="border-frame border-frame--sm"
                        disabled={busy || awardsBusy || !canEdit}
                        onClick={() => startEditAward(index)}
                      >
                        Uredi
                      </button>
                      <button
                        type="button"
                        className="border-frame border-frame--sm"
                        disabled={busy || awardsBusy || !canEdit}
                        onClick={() => void removeAwardRow(index)}
                      >
                        Odstrani
                      </button>
                    </div>
                  </div>
                );
              })}

              <div
                className="border-frame border-frame--sm"
                style={{ padding: "0.75rem" }}
              >
                <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                  {editingAwardIndex != null
                    ? "Uredi nagrado"
                    : "Dodaj nagrado"}
                </h3>
                <div className="row-actions row-actions--fields">
                  <label>
                    Nagrada
                    <select
                      value={
                        creatingNewAwardType ? "__new__" : draftAward.award_id
                      }
                      disabled={busy || !canEdit}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setCreatingNewAwardType(true);
                          setDraftAward((r) => ({ ...r, award_id: "" }));
                          return;
                        }
                        setCreatingNewAwardType(false);
                        setDraftAward((r) => ({
                          ...r,
                          award_id: e.target.value,
                        }));
                      }}
                    >
                      <option value="">— izberi —</option>
                      {awardsCatalog.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                      <option value="__new__">+ Nova nagrada…</option>
                    </select>
                  </label>
                  <label>
                    Igralec
                    <select
                      value={draftAward.player_id}
                      disabled={busy || !canEdit}
                      onChange={(e) =>
                        setDraftAward((r) => ({
                          ...r,
                          player_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">—</option>
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} {formatPersonName(p.person)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Opomba
                    <input
                      value={draftAward.notes}
                      disabled={busy || !canEdit}
                      placeholder="opcijsko"
                      onChange={(e) =>
                        setDraftAward((r) => ({
                          ...r,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {creatingNewAwardType ? (
                  <div className="row-actions row-actions--fields">
                    <label>
                      Ime nove nagrade *
                      <input
                        value={newAwardName}
                        disabled={busy || !canEdit}
                        placeholder="npr. Najboljši mladi"
                        onChange={(e) => setNewAwardName(e.target.value)}
                      />
                    </label>
                    <label>
                      Opis
                      <input
                        value={newAwardDescription}
                        disabled={busy || !canEdit}
                        placeholder="opcijsko"
                        onChange={(e) =>
                          setNewAwardDescription(e.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    className="sketch-check border-frame border-frame--sm"
                    checked={draftAward.with_prize}
                    disabled={busy || !canEdit}
                    onChange={(e) =>
                      setDraftAward((r) => ({
                        ...r,
                        with_prize: e.target.checked,
                      }))
                    }
                  />
                  Dodaj nagradni sklad
                </label>

                {draftAward.with_prize ? (
                  <div className="row-actions row-actions--fields">
                    <label>
                      Tip
                      <select
                        value={draftAward.prize_type}
                        disabled={busy || !canEdit}
                        onChange={(e) =>
                          setDraftAward((r) => ({
                            ...r,
                            prize_type: e.target.value,
                          }))
                        }
                      >
                        {PRIZE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Vrednost
                      <input
                        value={draftAward.prize_value}
                        disabled={busy || !canEdit}
                        onChange={(e) =>
                          setDraftAward((r) => ({
                            ...r,
                            prize_value: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Sponzor
                      <select
                        value={draftAward.sponsor_id}
                        disabled={busy || !canEdit}
                        onChange={(e) =>
                          setDraftAward((r) => ({
                            ...r,
                            sponsor_id: e.target.value,
                          }))
                        }
                      >
                        <option value="">—</option>
                        {data.sponsors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Opis sklada
                      <input
                        value={draftAward.prize_description}
                        disabled={busy || !canEdit}
                        onChange={(e) =>
                          setDraftAward((r) => ({
                            ...r,
                            prize_description: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <div className="row-actions">
                  <button
                    type="button"
                    className="border-frame border-frame--sm"
                    disabled={
                      busy ||
                      awardsBusy ||
                      !canEdit ||
                      !draftAward.player_id ||
                      (!draftAward.award_id &&
                        !(creatingNewAwardType && newAwardName.trim()))
                    }
                    onClick={() => void submitAwardForm()}
                  >
                    {busy || awardsBusy
                      ? "Shranjujem…"
                      : editingAwardIndex != null
                        ? "Shrani spremembe"
                        : "Dodaj nagrado"}
                  </button>
                  {editingAwardIndex != null ? (
                    <button
                      type="button"
                      className="border-frame border-frame--sm"
                      disabled={busy}
                      onClick={cancelAwardForm}
                    >
                      Prekliči
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Zaključi turnir</h2>
            {done ? (
              <p>
                Edicija je zaključena. Status: <strong>finished</strong>.
              </p>
            ) : (
              <p className="muted">
                Shrani končno lestvico in nagrade ter prestavi status na
                finished.
              </p>
            )}
            <div className="row-actions">
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={
                  busy ||
                  !canEdit ||
                  !data.can_finish ||
                  data.status.code === "finished"
                }
                onClick={() => void onFinish()}
              >
                {busy ? "Zaključujem…" : "Zaključi turnir"}
              </button>
            </div>
            {!canEdit ? (
              <p className="muted">Nimaš dovoljenja za zaključek.</p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
