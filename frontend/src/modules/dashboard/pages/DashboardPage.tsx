import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";
import { useAuth } from "@/shared/auth";

export function DashboardPage() {
  const { user, roles, hasPermission } = useAuth();

  const permissionSet = new Set<string>();
  for (const role of roles) {
    for (const code of role.permissions) {
      permissionSet.add(code);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Quick links and your current permissions."
      />

      <section className="border-frame border-frame--md">
        <h2>Signed in as</h2>
        {user ? (
          <ul className="plain-list">
            <li>
              <strong>{user.username}</strong> (id {user.id})
            </li>
            <li>Superuser: {user.is_superuser ? "yes" : "no"}</li>
            <li>
              Can create tournaments:{" "}
              {hasPermission("tournament.create") ? "yes" : "no"}
            </li>
          </ul>
        ) : (
          <p className="muted">Not signed in.</p>
        )}
      </section>

      <section className="border-frame border-frame--md">
        <h2>Quick links</h2>
        <ul className="plain-list">
          <li>
            <Link to="/tournaments">Tournaments</Link>
          </li>
          <li>
            <Link to="/teams">Teams</Link>
          </li>
          <li>
            <Link to="/players">Players</Link>
          </li>
          {hasPermission("tournament.create") ? (
            <li>
              <Link to="/tournaments/new">Create tournament</Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="border-frame border-frame--md">
        <h2>Roles</h2>
        {roles.length === 0 ? (
          <p className="muted">No roles assigned.</p>
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
        <h2>Permissions</h2>
        {permissionSet.size === 0 && !user?.is_superuser ? (
          <p className="muted">No permissions listed.</p>
        ) : (
          <ul className="plain-list">
            {user?.is_superuser ? <li>all (superuser)</li> : null}
            {[...permissionSet].sort().map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
