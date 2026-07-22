import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  type PlayerDetail,
  type PlayerStatus,
} from "../services/playerService";

type FormState = {
  status: string;
  position: string;
  secondary_position: string;
  preferred_jersey_number: string;
  height_cm: string;
  weight_kg: string;
  dominant_foot: string;
  current_club: string;
  contract_until: string;
  nationality: string;
  biography: string;
  notes: string;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    status: "",
    position: "",
    secondary_position: "",
    preferred_jersey_number: "",
    height_cm: "",
    weight_kg: "",
    dominant_foot: "",
    current_club: "",
    contract_until: "",
    nationality: "",
    biography: "",
    notes: "",
    is_active: true,
  };
}

function detailToForm(p: PlayerDetail): FormState {
  return {
    status: p.status?.id != null ? String(p.status.id) : "",
    position: p.position || "",
    secondary_position: p.secondary_position || "",
    preferred_jersey_number:
      p.preferred_jersey_number != null
        ? String(p.preferred_jersey_number)
        : "",
    height_cm: p.height_cm != null ? String(p.height_cm) : "",
    weight_kg: p.weight_kg != null ? String(p.weight_kg) : "",
    dominant_foot: p.dominant_foot || "",
    current_club: p.current_club || "",
    contract_until: p.contract_until || "",
    nationality: p.nationality || "",
    biography: p.biography || "",
    notes: p.notes || "",
    is_active: p.is_active,
  };
}

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function PlayerEditPage() {
  const { id } = useParams();
  const playerId = Number(id);
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const canEdit = isAdmin || hasPermission("player.manage");

  const player = useAsyncData(() => playerService.get(playerId), [playerId]);
  const statuses = useAsyncData(() => playerService.listStatuses(), []);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (player.data) setForm(detailToForm(player.data));
  }, [player.data]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    try {
      await playerService.update(playerId, {
        status: numOrNull(form.status) ?? undefined,
        position: form.position,
        secondary_position: form.secondary_position,
        preferred_jersey_number: numOrNull(form.preferred_jersey_number),
        height_cm: numOrNull(form.height_cm),
        weight_kg: numOrNull(form.weight_kg),
        dominant_foot: form.dominant_foot,
        current_club: form.current_club,
        contract_until: form.contract_until.trim() || null,
        nationality: form.nationality,
        biography: form.biography,
        notes: form.notes,
        is_active: form.is_active,
      });
      navigate(`/players/${playerId}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(playerId)) {
    return <StateMessage variant="error" message="Neveljaven igralec." />;
  }

  if (!canEdit) {
    return (
      <StateMessage
        variant="error"
        message="Nimaš dovoljenja za urejanje igralca."
      />
    );
  }

  const statusList: PlayerStatus[] = Array.isArray(statuses.data)
    ? statuses.data
    : [];

  return (
    <div className="page narrow">
      <PageHeader
        title={
          player.data
            ? `Uredi: ${formatPersonName(player.data.person)}`
            : "Uredi igralca"
        }
        subtitle="Admin urejanje"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/players/${playerId}`}
          >
            Nazaj na profil
          </Link>
        }
      />
      <ErrorBanner error={error ?? player.error ?? statuses.error} />
      {player.loading ? <StateMessage variant="loading" /> : null}

      {player.data ? (
        <section className="border-frame border-frame--md">
          <form className="stack-form" onSubmit={onSubmit}>
            <p className="muted">
              Person #{player.data.person.id} · Player #{player.data.id}
            </p>

            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                <option value="">—</option>
                {statusList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Pozicija
              <input
                value={form.position}
                onChange={(e) => setField("position", e.target.value)}
              />
            </label>
            <label>
              Sekundarna pozicija
              <input
                value={form.secondary_position}
                onChange={(e) =>
                  setField("secondary_position", e.target.value)
                }
              />
            </label>
            <label>
              Prednostni dres
              <input
                type="number"
                min={1}
                value={form.preferred_jersey_number}
                onChange={(e) =>
                  setField("preferred_jersey_number", e.target.value)
                }
              />
            </label>
            <label>
              Višina (cm)
              <input
                type="number"
                min={0}
                value={form.height_cm}
                onChange={(e) => setField("height_cm", e.target.value)}
              />
            </label>
            <label>
              Teža (kg)
              <input
                type="number"
                min={0}
                value={form.weight_kg}
                onChange={(e) => setField("weight_kg", e.target.value)}
              />
            </label>
            <label>
              Dominantna noga
              <select
                value={form.dominant_foot}
                onChange={(e) => setField("dominant_foot", e.target.value)}
              >
                <option value="">—</option>
                <option value="left">Leva</option>
                <option value="right">Desna</option>
                <option value="both">Obe</option>
              </select>
            </label>
            <label>
              Trenutni klub
              <input
                value={form.current_club}
                onChange={(e) => setField("current_club", e.target.value)}
              />
            </label>
            <label>
              Pogodba do
              <input
                type="date"
                value={form.contract_until}
                onChange={(e) => setField("contract_until", e.target.value)}
              />
            </label>
            <label>
              Državljanstvo (besedilo)
              <input
                value={form.nationality}
                onChange={(e) => setField("nationality", e.target.value)}
              />
            </label>
            <label>
              Biografija
              <textarea
                value={form.biography}
                onChange={(e) => setField("biography", e.target.value)}
                rows={4}
              />
            </label>
            <label>
              Opombe (interno)
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                className="border-frame border-frame--sm"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
              Aktiven
            </label>

            <div className="row-actions">
              <button
                type="submit"
                className="border-frame border-frame--sm"
                disabled={busy}
              >
                {busy ? "Shranjujem..." : "Shrani"}
              </button>
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/players/${playerId}`}
              >
                Prekliči
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
