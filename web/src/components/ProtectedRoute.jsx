import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Backward compatible: if requiredRole is provided, treat it as a single-item list
  const roles = requiredRoles || (requiredRole ? [requiredRole] : null);
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
