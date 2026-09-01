import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import type { Uloga } from "../../types";

interface Props {
  dozvoljeneUloge: Uloga[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ dozvoljeneUloge, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <p>Učitavanje...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!dozvoljeneUloge.includes(user.uloga)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
