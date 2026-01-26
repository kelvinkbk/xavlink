import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

// Color palettes matching web application
const colorPalettes = {
  "obsidian-blue": {
    primary: "#0a2540",
    accent: "#9ca3af",
    highlight: "#38bdf8",
    surface: "#050b14",
    card: "#0f172a",
    text: "#e5e7eb",
    muted: "#9ca3af",
    border: "#1e293b",
  },
  emerald: {
    primary: "#064e3b",
    accent: "#10b981",
    highlight: "#a7f3d0",
    surface: "#0b0f0e",
    card: "#111827",
    text: "#ecfdf5",
    muted: "#6b7280",
    border: "#1f2937",
  },
  "royal-purple": {
    primary: "#4c1d95",
    accent: "#a78bfa",
    glow: "#ddd6fe",
    surface: "#09090b",
    card: "#18181b",
    text: "#fafafa",
    muted: "#a1a1aa",
    border: "#27272a",
  },
  champagne: {
    primary: "#e8c38e",
    accent: "#c7a46a",
    surface: "#0e0e0e",
    card: "#1a1a1a",
    text: "#f5f5f5",
    muted: "#a3a3a3",
    border: "#262626",
  },
  crimson: {
    primary: "#7f1d1d",
    accent: "#dc2626",
    highlight: "#fca5a5",
    surface: "#070707",
    card: "#141414",
    text: "#fafafa",
    muted: "#737373",
    border: "#1f1f1f",
  },
  "midnight-teal": {
    primary: "#0f766e",
    accent: "#99f6e4",
    metallic: "#d1d5db",
    surface: "#050f0e",
    card: "#0f1e1c",
    text: "#ecfeff",
    muted: "#9ca3af",
    border: "#1e3a38",
  },
  graphite: {
    primary: "#111827",
    accent: "#e5e7eb",
    highlight: "#60a5fa",
    surface: "#020617",
    card: "#0f172a",
    text: "#f9fafb",
    muted: "#9ca3af",
    border: "#1e293b",
  },
  pearl: {
    primary: "#f5f5f4",
    accent: "#d6d3d1",
    ink: "#09090b",
    surface: "#030303",
    card: "#111111",
    text: "#fafafa",
    muted: "#a8a29e",
    border: "#1f1f1f",
  },
  "carbon-blue": {
    primary: "#0ea5e9",
    accent: "#38bdf8",
    glow: "#7dd3fc",
    surface: "#020617",
    card: "#0b1220",
    text: "#e0f2fe",
    muted: "#94a3b8",
    border: "#1e293b",
  },
  mocha: {
    primary: "#7c2d12",
    accent: "#e7cba9",
    surface: "#0c0a09",
    card: "#1c1917",
    text: "#faf7f5",
    muted: "#a8a29e",
    border: "#292524",
  },
  bronze: {
    primary: "#cd7f32",
    accent: "#e6b873",
    surface: "#060606",
    card: "#151515",
    text: "#fafaf9",
    muted: "#a1a1aa",
    border: "#262626",
  },
  gold: {
    primary: "#d4af37",
    accent: "#ffd966",
    surface: "#0a0a0a",
    card: "#161616",
    text: "#fafaf9",
    muted: "#a1a1aa",
    border: "#262626",
  },
};

// Default colors (matching web's default)
const defaultPalette = colorPalettes.champagne;

export const ThemeProvider = ({ children }) => {
  // Always use dark theme (matching web)
  const [theme] = useState("dark");
  const [colorPalette, setColorPalette] = useState("champagne");

  useEffect(() => {
    (async () => {
      const storedPalette = await AsyncStorage.getItem("colorPalette");
      if (storedPalette && colorPalettes[storedPalette]) {
        setColorPalette(storedPalette);
      }
    })();
  }, []);

  const setPalette = async (paletteName) => {
    if (colorPalettes[paletteName]) {
      setColorPalette(paletteName);
      await AsyncStorage.setItem("colorPalette", paletteName);
    }
  };

  const palette = colorPalettes[colorPalette] || defaultPalette;

  // Map to mobile-friendly color names (keeping backward compatibility)
  const colors = {
    // Main colors from palette
    primary: palette.primary,
    accent: palette.accent || palette.primary,
    background: palette.surface,
    surface: palette.card,
    card: palette.card,
    
    // Text colors
    textPrimary: palette.text,
    textSecondary: palette.text,
    textMuted: palette.muted,
    
    // UI colors
    border: palette.border,
    
    // System colors (consistent across all palettes)
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: palette.highlight || palette.accent || palette.primary,
    
    // Additional palette colors
    highlight: palette.highlight || palette.accent,
    glow: palette.glow || palette.accent,
    metallic: palette.metallic || palette.muted,
  };

  const value = {
    theme,
    isDark: true, // Always dark
    colorPalette,
    colorPalettes: Object.keys(colorPalettes),
    colors,
    setPalette,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
