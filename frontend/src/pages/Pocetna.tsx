import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Pocetna() {
  const { user, loading } = useAuth();

  if (loading) return <p>Učitavanje...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.uloga === "ADMIN")
    return <Navigate to="/admin/dermatolozi" replace />;
  return <Navigate to="/termini" replace />;
}
