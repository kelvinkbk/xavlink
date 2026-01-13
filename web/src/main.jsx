import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Always use dark mode - apply persisted color palette before React mounts to avoid flicker
const persistedColorPalette = localStorage.getItem("colorPalette") || "champagne";
document.documentElement.dataset.theme = "dark";
document.documentElement.dataset.colorPalette = persistedColorPalette;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
