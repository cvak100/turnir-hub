import { Link } from "react-router-dom";
import { useAuth } from "@/shared/auth";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="page home-page">
      <section className="border-frame border-frame--md">
        <h1>Zapisnik turnirjev</h1>
        <p className="muted">
          Priprava, razpis in live beleženje tekem.
        </p>
        <div className="row-actions">
          <Link className="button-link border-frame border-frame--sm" to="/tournaments">
            Turnirji
          </Link>
          <Link className="button-link border-frame border-frame--sm" to="/live">
            Live
          </Link>
          {user ? (
            <Link className="button-link border-frame border-frame--sm" to="/account">
              Moj račun
            </Link>
          ) : (
            <Link className="button-link border-frame border-frame--sm" to="/login">
              Prijava
            </Link>
          )}
        </div>
      </section>

      <section className="border-frame border-frame--md">
        <h2>Kaj lahko narediš</h2>
        <ul className="plain-list">
          <li>
            <Link to="/tournaments">Preglej turnirje</Link> in edicije
          </li>
          <li>
            <Link to="/live">Sledi live tekmam</Link>
          </li>
          <li>
            <Link to="/stats">Statistika</Link> (kmalu)
          </li>
        </ul>
      </section>
    </div>
  );
}
