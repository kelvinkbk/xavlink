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
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import HomeSimple from "./pages/HomeSimple";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import Skills from "./pages/Skills";
import Requests from "./pages/Requests";
import Notifications from "./pages/Notifications";
import NotificationsPage from "./pages/NotificationsPage";
import Settings from "./pages/Settings";
import ChatListPage from "./pages/ChatListPage";
import ChatPage from "./pages/ChatPage";
import Admin from "./pages/Admin";
import Moderation from "./pages/Moderation";
import EnhancementsPage from "./pages/EnhancementsPage";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function AppContent() {
  const {
    showCreatePostModal,
    setShowCreatePostModal,
    showAddSkillModal,
    setShowAddSkillModal,
  } = useModal();

  return (
    <>
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
