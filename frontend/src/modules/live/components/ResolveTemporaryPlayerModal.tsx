import { useEffect, useState } from "react";
import { ErrorBanner } from "@/shared/components";
import { personService } from "@/modules/admin/services/personService";
import {
  participationPlayerService,
  playerService,
  type PlayerListItem,
} from "@/modules/players/services/playerService";
import {
  matchEventService,
  type MatchEventListItem,
} from "@/modules/matches/services/matchService";
import { playerLabel } from "./LiveEventEditor";

type Mode = "menu" | "search" | "create";

type Props = {
  event: MatchEventListItem | null;
  editionId: number | null;
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
};

function guessJersey(label: string): string {
  const m = label.match(/#?\s*(\d{1,2})\b/);
  return m ? m[1] : "";
}

export function ResolveTemporaryPlayerModal({
  event,
  editionId,
  open,
  onClose,
  onLinked,
}: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerListItem[]>([]);
  const [searching, setSearching] = useState(false);
  /** Players assigned to OTHER teams in this edition — not selectable. */
  const [blockedPlayerIds, setBlockedPlayerIds] = useState<Set<number>>(
    () => new Set(),
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [jersey, setJersey] = useState("");

  useEffect(() => {
    if (!open || !event) return;
    setMode("menu");
    setError(null);
    setQuery("");
    setResults([]);
    setBlockedPlayerIds(new Set());
    setFirstName("");
    setLastName("");
    setNickname(event.temporary_player_label || "");
    setJersey(guessJersey(event.temporary_player_label || ""));
  }, [open, event?.id]);

  useEffect(() => {
    if (!open || mode !== "search" || editionId == null || !event) return;
    let cancelled = false;
    participationPlayerService
      .list({ tournament_edition: editionId, page_size: 500 })
      .then((page) => {
        if (cancelled) return;
        const blocked = new Set<number>();
        for (const row of page.results) {
          if (row.team_participation !== event.team_participation) {
            blocked.add(row.player.id);
          }
        }
        setBlockedPlayerIds(blocked);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, editionId, event?.id, event?.team_participation]);

  useEffect(() => {
    if (!open || mode !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      playerService
        .list({ search: q, page_size: 40, is_active: true })
        .then((page) => {
          if (cancelled) return;
          setResults(
            page.results.filter((p) => !blockedPlayerIds.has(p.id)),
          );
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, mode, open, blockedPlayerIds]);

  if (!open || !event) return null;

  async function ensureOnRoster(playerId: number) {
    const teamId = event!.team_participation;
    const existing = await participationPlayerService.list({
      team_participation: teamId,
      player: playerId,
      page_size: 5,
    });
    if (existing.results.length > 0) return;
    await participationPlayerService.create({
      team_participation: teamId,
      player: playerId,
      jersey_number: jersey.trim() === "" ? null : Number.parseInt(jersey, 10),
    });
  }

  async function linkPlayer(playerId: number) {
    setBusy(true);
    setError(null);
    try {
      await ensureOnRoster(playerId);
      await matchEventService.update(event!.id, {
        player: playerId,
        is_temporary_player: false,
        temporary_player_label: "",
      });
      onLinked();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function createAndLink() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Vnesi ime in priimek.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const person = await personService.create({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim(),
        is_player: true,
        player: {
          jersey_number:
            jersey.trim() === "" ? null : Number.parseInt(jersey, 10),
        },
      });
      const playerId = person.player?.id;
      if (playerId == null) {
        throw new Error("Igralec ni bil ustvarjen (manjka player profile).");
      }
      await ensureOnRoster(playerId);
      await matchEventService.update(event!.id, {
        player: playerId,
        is_temporary_player: false,
        temporary_player_label: "",
      });
      onLinked();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="live-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="live-modal live-modal--wide border-frame border-frame--md"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Poveži neznanega igralca</h3>
        <p className="muted">
          {event.temporary_player_label || "Neznani"} · dogodek #{event.id}
        </p>
        <ErrorBanner error={error} />

        {mode === "menu" ? (
          <div className="stack-form">
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => setMode("create")}
            >
              Dodaj novega igralca
            </button>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => setMode("search")}
            >
              Izberi obstoječega igralca
            </button>
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              disabled={busy}
              onClick={onClose}
            >
              Prekliči
            </button>
          </div>
        ) : null}

        {mode === "search" ? (
          <div className="stack-form">
            <label>
              Iskanje (prosti + ta ekipa)
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Priimek, ime…"
                autoFocus
              />
            </label>
            <p className="muted">
              Skriti so igralci, ki so že prijavljeni na drugi ekipi v tej
              ediciji.
            </p>
            {searching ? <p className="muted">Iščem…</p> : null}
            {!searching && query.trim().length >= 2 && results.length === 0 ? (
              <p className="muted">Ni zadetkov.</p>
            ) : null}
            <ul className="live-player-pick-list">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="live-roster-btn border-frame border-frame--sm"
                    disabled={busy}
                    onClick={() => void linkPlayer(p.id)}
                  >
                    <span className="live-roster-btn__num">
                      {p.preferred_jersey_number ?? "—"}
                    </span>
                    {playerLabel(p.person)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="row-actions">
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={busy}
                onClick={() => setMode("menu")}
              >
                Nazaj
              </button>
            </div>
          </div>
        ) : null}

        {mode === "create" ? (
          <div className="stack-form">
            <label>
              Ime *
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              Priimek *
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
            <label>
              Vzdevek
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>
            <label>
              Dres #
              <input
                type="number"
                min={0}
                max={99}
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
              />
            </label>
            <div className="row-actions">
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy}
                onClick={() => void createAndLink()}
              >
                {busy ? "Shranjujem…" : "Ustvari in poveži"}
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                disabled={busy}
                onClick={() => setMode("menu")}
              >
                Nazaj
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
