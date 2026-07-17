import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CountryFlag,
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import {
  personService,
  type Country,
  type PersonDetail,
  type PersonStatus,
  type PlayerStatus,
} from "@/modules/admin/services/personService";

type Mode = "create" | "edit";

type FormState = {
  first_name: string;
  last_name: string;
  nickname: string;
  date_of_birth: string;
  place_of_birth: string;
  nationality: string;
  gender: string;
  bio: string;
  status: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  show_as_anonymous: boolean;
  notes: string;
  is_player: boolean;
  is_coach: boolean;
  is_referee: boolean;
  is_staff: boolean;
  is_official: boolean;
  position: string;
  secondary_position: string;
  jersey_number: string;
  preferred_foot: string;
  height: string;
  weight: string;
  current_club: string;
  player_status: string;
  contract_until: string;
};

const emptyForm = (): FormState => ({
  first_name: "",
  last_name: "",
  nickname: "",
  date_of_birth: "",
  place_of_birth: "",
  nationality: "",
  gender: "",
  bio: "",
  status: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  show_as_anonymous: false,
  notes: "",
  is_player: false,
  is_coach: false,
  is_referee: false,
  is_staff: false,
  is_official: false,
  position: "",
  secondary_position: "",
  jersey_number: "",
  preferred_foot: "",
  height: "",
  weight: "",
  current_club: "",
  player_status: "",
  contract_until: "",
});

function detailToForm(person: PersonDetail): FormState {
  const p = person.player;
  return {
    first_name: person.first_name,
    last_name: person.last_name,
    nickname: person.nickname || "",
    date_of_birth: person.date_of_birth || "",
    place_of_birth: person.place_of_birth || "",
    nationality: person.nationality ? String(person.nationality.id) : "",
    gender: person.gender || "",
    bio: person.bio || "",
    status: person.status ? String(person.status.id) : "",
    email: person.email || "",
    phone: person.phone || "",
    city: person.city || "",
    country: person.country || "",
    show_as_anonymous: person.show_as_anonymous,
    notes: person.notes || "",
    is_player: person.is_player,
    is_coach: person.is_coach,
    is_referee: person.is_referee,
    is_staff: person.is_staff,
    is_official: person.is_official,
    position: p?.position || "",
    secondary_position: p?.secondary_position || "",
    jersey_number:
      p?.jersey_number != null ? String(p.jersey_number) : "",
    preferred_foot: p?.preferred_foot || "",
    height: p?.height != null ? String(p.height) : "",
    weight: p?.weight != null ? String(p.weight) : "",
    current_club: p?.current_club || "",
    player_status: p?.player_status ? String(p.player_status.id) : "",
    contract_until: p?.contract_until || "",
  };
}

function optionalInt(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function PersonFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const personId = mode === "edit" ? Number(id) : null;

  const existing = useAsyncData(
    () =>
      personId ? personService.get(personId) : Promise.resolve(null),
    [personId],
  );

  const lookups = useAsyncData(async () => {
    const [statuses, playerStatuses, countries] = await Promise.all([
      personService.listStatuses(),
      personService.listPlayerStatuses(),
      personService.listCountries(),
    ]);
    return { statuses, playerStatuses, countries };
  }, []);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [initialized, setInitialized] = useState(mode === "create");

  const statuses: PersonStatus[] = lookups.data?.statuses ?? [];
  const playerStatuses: PlayerStatus[] =
    lookups.data?.playerStatuses ?? [];
  const countries: Country[] = lookups.data?.countries ?? [];

  const selectedCountry = useMemo(
    () => countries.find((c) => String(c.id) === form.nationality) ?? null,
    [countries, form.nationality],
  );

  const defaultStatusId = useMemo(() => {
    const active = statuses.find((s) => s.code === "active");
    return active ? String(active.id) : statuses[0] ? String(statuses[0].id) : "";
  }, [statuses]);

  const defaultPlayerStatusId = useMemo(() => {
    const active = playerStatuses.find((s) => s.code === "active");
    return active
      ? String(active.id)
      : playerStatuses[0]
        ? String(playerStatuses[0].id)
        : "";
  }, [playerStatuses]);

  useEffect(() => {
    if (mode === "create" && defaultStatusId && !form.status) {
      setForm((f) => ({ ...f, status: defaultStatusId }));
    }
  }, [defaultStatusId, form.status, mode]);

  useEffect(() => {
    if (mode === "edit" && existing.data) {
      setForm(detailToForm(existing.data));
      setInitialized(true);
    }
  }, [existing.data, mode]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.status) {
      setError(new Error("Status je obvezen."));
      return;
    }
    if (
      mode === "create" &&
      !form.is_player &&
      !form.is_coach &&
      !form.is_referee &&
      !form.is_staff &&
      !form.is_official
    ) {
      setError(new Error("Izberi vsaj eno vlogo."));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        nickname: form.nickname.trim(),
        date_of_birth: form.date_of_birth.trim() || null,
        place_of_birth: form.place_of_birth.trim(),
        nationality: form.nationality ? Number(form.nationality) : null,
        gender: form.gender,
        bio: form.bio.trim(),
        status: Number(form.status),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        show_as_anonymous: form.show_as_anonymous,
        notes: form.notes.trim(),
        is_player: form.is_player,
        is_coach: form.is_coach,
        is_referee: form.is_referee,
        is_staff: form.is_staff,
        is_official: form.is_official,
        player: form.is_player
          ? {
              position: form.position.trim(),
              secondary_position: form.secondary_position.trim(),
              jersey_number: optionalInt(form.jersey_number),
              preferred_foot: form.preferred_foot.trim(),
              height: optionalInt(form.height),
              weight: optionalInt(form.weight),
              current_club: form.current_club.trim(),
              player_status: form.player_status
                ? Number(form.player_status)
                : defaultPlayerStatusId
                  ? Number(defaultPlayerStatusId)
                  : null,
              contract_until: form.contract_until.trim() || null,
            }
          : null,
      };

      if (mode === "create") {
        const created = await personService.create(payload);
        navigate(`/dashboard_admin/persons/${created.id}`);
      } else if (personId) {
        await personService.update(personId, payload);
        navigate(`/dashboard_admin/persons/${personId}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const backTo =
    mode === "edit" && personId
      ? `/dashboard_admin/persons/${personId}`
      : "/dashboard_admin/persons";

  if (mode === "edit" && (existing.loading || !initialized)) {
    return <StateMessage variant="loading" />;
  }

  if (lookups.loading && statuses.length === 0) {
    return <StateMessage variant="loading" />;
  }

  return (
    <div className="page narrow">
      <PageHeader
        title={mode === "create" ? "Nova oseba" : "Uredi osebo"}
        subtitle="Osnovni podatki, kontakt, vloge in (če player) atributi."
        actions={
          <Link className="button-link border-frame border-frame--sm" to={backTo}>
            ← Nazaj
          </Link>
        }
      />
      <ErrorBanner error={error ?? existing.error ?? lookups.error} />
      <form className="stack-form border-frame border-frame--md" onSubmit={onSubmit}>
        <h2>Osnovni podatki</h2>
        <label>
          Ime *
          <input
            value={form.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            required
          />
        </label>
        <label>
          Priimek *
          <input
            value={form.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
            required
          />
        </label>
        <label>
          Vzdevek
          <input
            value={form.nickname}
            onChange={(e) => setField("nickname", e.target.value)}
          />
        </label>
        <label>
          Datum rojstva
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setField("date_of_birth", e.target.value)}
          />
        </label>
        <label>
          Kraj rojstva
          <input
            value={form.place_of_birth}
            onChange={(e) => setField("place_of_birth", e.target.value)}
          />
        </label>
        <label>
          Državljanstvo
          <div className="nationality-select-row">
            {selectedCountry ? (
              <CountryFlag
                iso2={selectedCountry.iso2}
                title={selectedCountry.name}
              />
            ) : null}
            <select
              value={form.nationality}
              onChange={(e) => setField("nationality", e.target.value)}
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </label>
        <label>
          Spol
          <select
            value={form.gender}
            onChange={(e) => setField("gender", e.target.value)}
          >
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Status *
          <select
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
            required
          >
            <option value="" disabled>
              Izberi…
            </option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bio
          <textarea
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            rows={3}
          />
        </label>
        <p className="muted">
          Photo upload pride v naslednjem koraku (ImageField je že na modelu).
        </p>

        <h2>Kontakt</h2>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </label>
        <label>
          Telefon
          <input
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </label>
        <label>
          Mesto
          <input
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </label>
        <label>
          Država
          <input
            value={form.country}
            onChange={(e) => setField("country", e.target.value)}
          />
        </label>

        <h2>Vloge</h2>
        <div className="role-check-grid">
          {(
            [
              ["is_player", "Player"],
              ["is_coach", "Coach"],
              ["is_referee", "Referee"],
              ["is_staff", "Staff"],
              ["is_official", "Official"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="checkbox-row">
              <input
                className="sketch-check border-frame border-frame--sm"
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setField(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="checkbox-row">
          <input
            className="sketch-check border-frame border-frame--sm"
            type="checkbox"
            checked={form.show_as_anonymous}
            onChange={(e) => setField("show_as_anonymous", e.target.checked)}
          />
          Prikazuj kot anonimno
        </label>
        <label>
          Opombe
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </label>

        {form.is_player ? (
          <>
            <h2>Player Attributes</h2>
            <label>
              Position
              <input
                value={form.position}
                onChange={(e) => setField("position", e.target.value)}
                placeholder="GK / DEF / MID / FWD…"
              />
            </label>
            <label>
              Secondary position
              <input
                value={form.secondary_position}
                onChange={(e) =>
                  setField("secondary_position", e.target.value)
                }
              />
            </label>
            <label>
              Jersey number
              <input
                type="number"
                min={0}
                max={99}
                value={form.jersey_number}
                onChange={(e) => setField("jersey_number", e.target.value)}
              />
            </label>
            <label>
              Preferred foot
              <select
                value={form.preferred_foot}
                onChange={(e) => setField("preferred_foot", e.target.value)}
              >
                <option value="">—</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label>
              Height (cm)
              <input
                type="number"
                min={0}
                value={form.height}
                onChange={(e) => setField("height", e.target.value)}
              />
            </label>
            <label>
              Weight (kg)
              <input
                type="number"
                min={0}
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
              />
            </label>
            <label>
              Current club
              <input
                value={form.current_club}
                onChange={(e) => setField("current_club", e.target.value)}
              />
            </label>
            <label>
              Player status
              <select
                value={form.player_status || defaultPlayerStatusId}
                onChange={(e) => setField("player_status", e.target.value)}
              >
                <option value="">—</option>
                {playerStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contract until
              <input
                type="date"
                value={form.contract_until}
                onChange={(e) => setField("contract_until", e.target.value)}
              />
            </label>
          </>
        ) : null}

        <div className="row-actions">
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={submitting}
          >
            {submitting ? "Shranjujem…" : "Shrani"}
          </button>
          <Link
            className="button-link button-secondary border-frame border-frame--sm"
            to={backTo}
          >
            Prekliči
          </Link>
        </div>
      </form>
    </div>
  );
}
