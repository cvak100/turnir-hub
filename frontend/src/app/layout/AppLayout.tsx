import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/shared/auth";

export function AppLayout() {
  const { user, logout, loading } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className="brand">
          turnir-hub
        </Link>
        <nav>
          <NavLink to="/tournaments">Tournaments</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/players">Players</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        <div className="nav-auth">
          {loading ? (
            <span className="muted">…</span>
          ) : user ? (
            <>
              <span className="muted">{user.username}</span>
              <button type="button" className="linkish" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
