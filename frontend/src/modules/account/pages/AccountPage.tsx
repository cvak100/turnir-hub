import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";
import { useAuth } from "@/shared/auth";

export function AccountPage() {
  const { user, roles, logout } = useAuth();

  return (
    <div className="page">
      <PageHeader title="Moj račun" subtitle="Tvoj profil in vloge." />
      <section className="border-frame border-frame--md">
        {user ? (
          <ul className="plain-list">
            <li>
              Uporabnik: <strong>{user.username}</strong>
            </li>
            <li>ID: {user.id}</li>
            <li>Superuser: {user.is_superuser ? "da" : "ne"}</li>
          </ul>
        ) : (
          <p className="muted">Nisi prijavljen.</p>
        )}
      </section>

      <section className="border-frame border-frame--md">
        <h2>Vloge</h2>
        {roles.length === 0 ? (
          <p className="muted">Brez dodeljenih vlog.</p>
        ) : (
          <ul className="plain-list">
            {roles.map((role, index) => (
              <li key={`${role.role}-${role.tournament_edition_id}-${index}`}>
                {role.role}
                {role.tournament_edition_id == null
                  ? " (global)"
                  : ` (edition ${role.tournament_edition_id})`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-frame border-frame--md">
        <div className="row-actions">
          <Link className="button-link border-frame border-frame--sm" to="/">
            Home
          </Link>
          <button type="button" className="border-frame border-frame--sm" onClick={logout}>
            Odjava
          </button>
        </div>
      </section>
    </div>
  );
}
