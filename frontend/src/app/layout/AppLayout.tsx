import { Link, Outlet } from "react-router-dom";
import { AppNav } from "@/app/layout/AppNav";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          turnir-hub
        </Link>
        <AppNav />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        handwritten tournament notebook
      </footer>
    </div>
  );
}
