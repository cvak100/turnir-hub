import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components";

export function UnauthorizedPage() {
  return (
    <div className="page narrow">
      <PageHeader
        title="Unauthorized"
        subtitle="You do not have permission to view this page."
      />
      <p>
        <Link to="/dashboard">Back to dashboard</Link> ·{" "}
        <Link to="/tournaments">Browse tournaments</Link>
      </p>
    </div>
  );
}
