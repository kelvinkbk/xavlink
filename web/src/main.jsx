import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Apply persisted theme before React mounts to avoid flicker
const persistedTheme = localStorage.getItem("theme") || "light";
document.documentElement.dataset.theme = persistedTheme;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
