import React from "react";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

/**
 * ProtectedRoute wrapper for React Native Navigation
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({
  children,
  requiredRole = null,
  requiredRoles = null,
}) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show spinner while loading auth state
  if (loading) {
    return <LoadingSpinner fullscreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null; // Navigation will handle redirect to AuthStack
  }

  // Check role-based access
  if (requiredRole || requiredRoles) {
    const roles = requiredRoles || [requiredRole];
    const hasRequiredRole = user && roles.includes(user.role);

    if (!hasRequiredRole) {
      return null; // Navigation will handle redirect to unauthorized
    }
  }

  return children;
};

export default ProtectedRoute;
