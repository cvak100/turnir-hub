import { NavLink } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import { getVisibleMenuItems } from "@/shared/navigation";

const navFrame = "border-frame border-frame--sm";

export function AppNav() {
  const { user, loading, logout, hasPermission, isAdmin } = useAuth();

  if (loading) {
    return (
      <nav className="app-nav-row" aria-label="Main">
        <span className="muted">…</span>
      </nav>
    );
  }

  const items = getVisibleMenuItems({ user, hasPermission, isAdmin });

  return (
    <nav className="app-nav-row" aria-label="Main">
      {items.map((item) => {
        if (item.action === "logout") {
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-action ${navFrame}`}
              onClick={logout}
            >
              {item.label}
            </button>
          );
        }

        if (!item.path) return null;

        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? `active ${navFrame}` : navFrame
            }
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
