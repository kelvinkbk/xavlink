import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService, setUnauthorizedHandler } from "../services/api";
import {
  joinUserRoom,
  markUserOnline,
  onNewNotification,
} from "../services/socket";

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");
        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn("Auth bootstrap failed", e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Setup socket connection when user is authenticated
  useEffect(() => {
    if (user?.id) {
      console.log("🔌 Setting up socket for user:", user.id);
      // Mark user as online (which also joins user room on backend)
      markUserOnline(user.id);

      // Listen for real-time notifications
      const cleanup = onNewNotification((notification) => {
        console.log(
          "🔔 New notification received in AuthContext:",
          notification,
        );
        // The notification will be handled by SyncContext
      });

      return () => {
        console.log("🔌 Cleaning up socket listeners for user:", user.id);
        cleanup();
      };
    }
  }, [user?.id]);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    setUser(data.user);
    setToken(data.token);
    if (data.token) {
      await AsyncStorage.setItem("token", data.token);
    }
    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
    }
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await authService.register(payload);
    setUser(data.user);
    setToken(data.token);
    if (data.token) {
      await AsyncStorage.setItem("token", data.token);
    }
    if (data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
    }
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("user");
  };

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await logout();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const updateUser = async (nextUser) => {
    setUser(nextUser);
    await AsyncStorage.setItem("user", JSON.stringify(nextUser));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
