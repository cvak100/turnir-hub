import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CountryFlag,
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { personService } from "@/modules/admin/services/personService";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return (
    <p>
      <strong>{label}:</strong> {display}
    </p>
  );
}

export function PersonDetailPage() {
  const { id } = useParams();
  const personId = Number(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useAsyncData(
    () => personService.get(personId),
    [personId],
  );

  async function onDelete() {
    if (!data) return;
    const ok = window.confirm("Izbrišem to osebo?");
    if (!ok) return;
    try {
      await personService.delete(data.id);
      navigate("/dashboard_admin/persons");
    } catch {
      await reload();
    }
  }

  if (loading) return <StateMessage variant="loading" />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return <StateMessage variant="empty" message="Oseba ne obstaja." />;

  const roleLabels = [
    data.is_player ? "Player" : null,
    data.is_coach ? "Coach" : null,
    data.is_referee ? "Referee" : null,
    data.is_staff ? "Staff" : null,
    data.is_official ? "Official" : null,
  ].filter(Boolean) as string[];

  const player = data.player;

  return (
    <div className="page">
      <PageHeader
        title={`${data.first_name} ${data.last_name}`}
        subtitle={data.nickname ? `Vzdevek: ${data.nickname}` : undefined}
        actions={
          <>
            {isAdmin ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/dashboard_admin/persons/${data.id}/edit`}
              >
                Uredi
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/dashboard_admin/persons"
            >
              ← Nazaj na seznam
            </Link>
          </>
        }
      />

      <section className="border-frame border-frame--md">
        <h2>Osnovni podatki</h2>
        <div className="role-badges" style={{ marginBottom: "0.75rem" }}>
          {roleLabels.length === 0 ? (
            <span className="muted">Brez vlog</span>
          ) : (
            roleLabels.map((label) => (
              <span
                key={label}
                className="role-badge border-frame border-frame--sm"
              >
                {label}
              </span>
            ))
          )}
        </div>
        {data.photo ? (
          <p>
            <img
              src={data.photo}
              alt=""
              style={{ maxWidth: 160, border: "1px solid #ccc" }}
            />
          </p>
        ) : null}
        <Field label="Datum rojstva" value={data.date_of_birth} />
        <Field label="Kraj rojstva" value={data.place_of_birth} />
        <p>
          <strong>Državljanstvo:</strong>{" "}
          {data.nationality ? (
            <span className="country-option">
              <CountryFlag
                iso2={data.nationality.iso2}
                title={data.nationality.name}
              />
              {data.nationality.name} ({data.nationality.code})
            </span>
          ) : (
            "—"
          )}
        </p>
        <Field label="Spol" value={data.gender} />
        <Field label="Status" value={data.status?.name} />
        <Field
          label="Povezan račun"
          value={
            data.user
              ? `${data.user.username} (id ${data.user.id})`
              : "—"
          }
        />
        <Field label="Bio" value={data.bio} />
        <Field
          label="Anonimno"
          value={data.show_as_anonymous ? "da" : "ne"}
        />
      </section>

      <section className="border-frame border-frame--md">
        <h2>Kontakt</h2>
        <Field label="Email" value={data.email} />
        <Field label="Telefon" value={data.phone} />
        <Field label="Mesto" value={data.city} />
        <Field label="Država" value={data.country} />
      </section>

      {data.is_player ? (
        <section className="border-frame border-frame--md">
          <h2>Player Attributes</h2>
          {player ? (
            <>
              <Field label="Position" value={player.position} />
              <Field
                label="Secondary position"
                value={player.secondary_position}
              />
              <Field label="Jersey number" value={player.jersey_number} />
              <Field label="Preferred foot" value={player.preferred_foot} />
              <Field label="Height (cm)" value={player.height} />
              <Field label="Weight (kg)" value={player.weight} />
              <Field label="Current club" value={player.current_club} />
              <Field
                label="Player status"
                value={player.player_status?.name}
              />
              <Field label="Contract until" value={player.contract_until} />
            </>
          ) : (
            <p className="muted">Player profil še ni ustvarjen.</p>
          )}
        </section>
      ) : null}

      {data.notes ? (
        <section className="border-frame border-frame--md">
          <h2>Opombe</h2>
          <p>{data.notes}</p>
        </section>
      ) : null}

      {isAdmin ? (
        <div className="row-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={() => void onDelete()}
          >
            Izbriši
          </button>
        </div>
      ) : null}
    </div>
  );
}
