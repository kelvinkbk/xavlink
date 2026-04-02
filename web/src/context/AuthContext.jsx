/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext } from "react";
import { toAbsolute } from "../services/api";

const normalizeStoredUser = (u) => {
  if (!u || typeof u !== "object") return u;
  return { ...u, profilePic: toAbsolute(u.profilePic) };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return normalizeStoredUser(JSON.parse(storedUser));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem("token"));

  const login = (userData, authToken) => {
    const normalized = normalizeStoredUser(userData);
    setUser(normalized);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(normalized));
    localStorage.setItem("userId", normalized.id || normalized._id);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
  };

  const updateUser = (updatedUserData) => {
    const merged = normalizeStoredUser({ ...user, ...updatedUserData });
    setUser(merged);
    localStorage.setItem("user", JSON.stringify(merged));
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
