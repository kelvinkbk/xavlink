import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {isAuthenticated && (
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isAuthenticated && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden p-3 transition hover:opacity-80 sticky top-0 z-20"
            style={{
              color: "var(--text)",
              backgroundColor: "var(--surface)",
            }}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: "var(--surface)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
