import { Navigate } from "react-router-dom";
import type { ReactNode } from "react"; // 👈 ajout du mot-clé "type"

type ProtectedRouteProps = {
  children: ReactNode;
  role?: string;
};

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
