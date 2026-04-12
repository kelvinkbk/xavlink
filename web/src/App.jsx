import React, { Suspense, lazy, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ModalProvider, useModal } from "./context/ModalContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import CreatePostModal from "./components/CreatePostModal";
import AddSkillModal from "./components/AddSkillModal";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import useWebPush from "./hooks/useWebPush";
import LoadingScreen from "./components/LoadingScreen";

// Lazy-loaded pages for optimized code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const HomeSimple = lazy(() => import("./pages/HomeSimple"));
const Discover = lazy(() => import("./pages/Discover"));
const Profile = lazy(() => import("./pages/Profile"));
const Skills = lazy(() => import("./pages/Skills"));
const Requests = lazy(() => import("./pages/Requests"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const ChatListPage = lazy(() => import("./pages/ChatListPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const Admin = lazy(() => import("./pages/Admin"));
const Moderation = lazy(() => import("./pages/Moderation"));
const EnhancementsPage = lazy(() => import("./pages/EnhancementsPage"));

// Simple loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function AppContent() {
  const {
    showCreatePostModal,
    setShowCreatePostModal,
    showAddSkillModal,
    setShowAddSkillModal,
  } = useModal();

  // Initialize web push notifications
  useWebPush();

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomeSimple />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <Skills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Requests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <ChatListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/moderation"
            element={
              <ProtectedRoute requiredRoles={["admin", "moderator"]}>
                <Moderation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enhancements"
            element={
              <ProtectedRoute>
                <EnhancementsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onSuccess={() => console.log("Post created")}
      />
      <AddSkillModal
        isOpen={showAddSkillModal}
        onClose={() => setShowAddSkillModal(false)}
        onSuccess={() => console.log("Skill added")}
      />
    </>
  );
}
function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for 1.5 seconds on startup
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ModalProvider>
          <SocketProvider>
            <NotificationProvider>
              <Router>
                <AuthProvider>
                  <MainLayout>
                    <AppContent />
                  </MainLayout>
                </AuthProvider>
              </Router>
            </NotificationProvider>
          </SocketProvider>
        </ModalProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
