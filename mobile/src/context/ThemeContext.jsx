import React, { createContext, useContext, useEffect, useState } from "react";
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

const lightColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  primary: "#3b82f6",
  success: "#10b981",
  danger: "#ef4444",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#94a3b8",
  border: "#e5e7eb",
};

const darkColors = {
  background: "#0f172a",
  surface: "#1f2937",
  primary: "#3b82f6",
  success: "#10b981",
  danger: "#ef4444",
  textPrimary: "#f9fafb",
  textSecondary: "#e5e7eb",
  textMuted: "#9ca3af",
  border: "#374151",
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("theme");
      if (stored === "dark" || stored === "light") setTheme(stored);
    })();
  }, []);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await AsyncStorage.setItem("theme", next);
  };

  const value = {
    theme,
    isDark: theme === "dark",
    colors: theme === "dark" ? darkColors : lightColors,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
