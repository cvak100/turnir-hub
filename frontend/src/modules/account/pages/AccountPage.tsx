import { useMemo, useState, type FormEvent } from "react";
import { PageHeader, ErrorBanner } from "@/shared/components";
import { useAuth } from "@/shared/auth";
import { isApiError } from "@/shared/api";
import { authService } from "@/modules/auth/services/authService";

function formatJoined(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("sl-SI");
}

function accountTypeLabel(user: {
  is_superuser: boolean;
  is_staff?: boolean;
}): string {
  if (user.is_superuser) return "Administrator";
  if (user.is_staff) return "Osebje";
  return "Uporabnik";
}

export function AccountPage() {
  const { user, roles, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const email = useMemo(() => {
    if (!user) return "";
    return (user.email || user.person?.email || "").trim();
  }, [user]);

  const permissionCount = useMemo(() => {
    const set = new Set<string>();
    for (const role of roles) {
      for (const code of role.permissions) set.add(code);
    }
    return set.size;
  }, [roles]);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(new Error("Izpolni vsa polja."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(new Error("Novo geslo in potrditev se ne ujemata."));
      return;
    }
    setBusy(true);
    try {
      const res = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      setSuccess(res.detail || "Geslo je spremenjeno.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (isApiError(err)) setError(new Error(err.message));
      else setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Moj račun" subtitle="Podatki o prijavi in geslo." />
      <ErrorBanner error={error} />

      <section className="border-frame border-frame--md">
        <h2>Račun</h2>
        {user ? (
          <dl className="account-dl">
            <div>
              <dt>Uporabniško ime</dt>
              <dd>
                <strong>{user.username}</strong>
              </dd>
            </div>
            <div>
              <dt>E-pošta</dt>
              <dd>{email || "—"}</dd>
            </div>
            <div>
              <dt>Tip računa</dt>
              <dd>{accountTypeLabel(user)}</dd>
            </div>
            <div>
              <dt>Član od</dt>
              <dd>{formatJoined(user.date_joined)}</dd>
            </div>
            <div>
              <dt>Vloge</dt>
              <dd>{roles.length}</dd>
            </div>
            <div>
              <dt>Dovoljenja</dt>
              <dd>{permissionCount}</dd>
            </div>
          </dl>
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
                <strong>{role.role_name || role.role}</strong>
                {role.tournament_edition_id == null
                  ? " · globalno"
                  : ` · edicija #${role.tournament_edition_id}`}
                {role.permissions.length > 0
                  ? ` · ${role.permissions.length} dovoljenj`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-frame border-frame--md">
        <h2>Spremeni geslo</h2>
        {success ? <p className="account-success">{success}</p> : null}
        <form className="stack-form" onSubmit={onChangePassword}>
          <label>
            Trenutno geslo
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Novo geslo
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Potrdi novo geslo
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className="row-actions">
            <button
              type="submit"
              className="border-frame border-frame--sm"
              disabled={busy}
            >
              {busy ? "Shranjujem…" : "Shrani geslo"}
            </button>
          </div>
        </form>
      </section>

      <section className="border-frame border-frame--md">
        <div className="row-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            onClick={logout}
          >
            Odjava
          </button>
        </div>
      </section>
    </div>
  );
}
