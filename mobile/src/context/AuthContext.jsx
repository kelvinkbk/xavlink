import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/api";
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
      joinUserRoom(user.id);
      markUserOnline(user.id);

      // Listen for real-time notifications
      const cleanup = onNewNotification((notification) => {
        console.log("New notification received:", notification);
        // You can show a local notification or update badge here
      });

      return cleanup;
    }
  }, [user?.id]);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    setUser(data.user);
    setToken(data.token);
    if (data.token) {
      await AsyncStorage.setItem("token", data.token);
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
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

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
