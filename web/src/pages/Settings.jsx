import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, {
  uploadService,
  twoFactorService,
  enhancementService,
} from "../services/api";
import PageTransition from "../components/PageTransition";
import ConfirmModal from "../components/ConfirmModal";
import LoadingSpinner from "../components/LoadingSpinner";

const Settings = () => {
  const { user, isAuthenticated, logout, token, login } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const applyTheme = () => {
    // Always use dark mode
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("theme", "dark");
  };

  const applyColorPalette = (paletteValue) => {
    if (!paletteValue) return;
    document.documentElement.dataset.colorPalette = paletteValue;
    localStorage.setItem("colorPalette", paletteValue);
  };

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    profilePic: user?.profilePic || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteForm, setDeleteForm] = useState({ password: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 2FA state
  const [twoFAState, setTwoFAState] = useState({
    secret: "",
    qrCode: "",
    isGenerating: false,
    code: "",
    disabling: false,
    enabling: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data } = await api.get(`/settings/me`);
        setSettings(data);
        applyTheme("dark");
        applyColorPalette(data?.colorPalette || "champagne");
        setLoading(false);
      } catch {
        console.error("Failed to fetch settings:");
        setError("Failed to load settings.");
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/settings/${user.id}/update-profile`, profileForm);
      setMessage("✅ Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Failed to update profile");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { url } = await uploadService.uploadProfilePic(file);
      setProfileForm({ ...profileForm, profilePic: url });
      setMessage("✅ Avatar uploaded successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setMessage("❌ Failed to upload avatar");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("❌ Passwords do not match");
      return;
    }
    try {
      await api.post(`/settings/${user.id}/change-password`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage("✅ Password changed successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || "Failed to change password";
      setMessage("❌ " + errorMsg);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleUpdateSettings = async (key, value) => {
    try {
      await api.put(`/settings/me`, { [key]: value });
      setSettings({ ...settings, [key]: value });
      // Always ensure theme is dark
      if (key === "theme") {
        applyTheme("dark");
      }
      if (key === "colorPalette") {
        applyColorPalette(value);
      }
      setMessage("✅ Settings updated");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Failed to update settings");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const startEnable2FA = async () => {
    setTwoFAState((s) => ({
      ...s,
      isGenerating: true,
      secret: "",
      qrCode: "",
      code: "",
    }));
    setMessage("");
    try {
      const { secret, qrCode } = await twoFactorService.generateSecret();
      setTwoFAState((s) => ({ ...s, isGenerating: false, secret, qrCode }));
    } catch {
      setTwoFAState((s) => ({ ...s, isGenerating: false }));
      setMessage("❌ Failed to generate 2FA secret");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const confirmEnable2FA = async () => {
    if (!twoFAState.secret || !twoFAState.code) {
      setMessage("❌ Please scan the QR and enter your code");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setTwoFAState((s) => ({ ...s, enabling: true }));
    try {
      const result = await twoFactorService.enableTwoFactor(
        twoFAState.secret,
        twoFAState.code
      );
      // Update local user
      const updatedUser = result.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // Refresh context user without changing token
      if (token) {
        login(updatedUser, token);
      }
      setMessage("✅ Two-factor authentication enabled");
      setTwoFAState({
        secret: "",
        qrCode: "",
        isGenerating: false,
        code: "",
        disabling: false,
        enabling: false,
      });
    } catch (err) {
      setMessage(err?.response?.data?.message || "❌ Failed to enable 2FA");
    } finally {
      setTimeout(() => setMessage(""), 3000);
      setTwoFAState((s) => ({ ...s, enabling: false }));
    }
  };

  const disable2FA = async () => {
    if (!deleteForm.password) {
      setMessage("❌ Password is required to disable 2FA");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setTwoFAState((s) => ({ ...s, disabling: true }));
    try {
      const result = await twoFactorService.disableTwoFactor(
        deleteForm.password
      );
      const updatedUser = result.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (token) {
        login(updatedUser, token);
      }
      setMessage("✅ Two-factor authentication disabled");
    } catch (err) {
      setMessage(err?.response?.data?.message || "❌ Failed to disable 2FA");
    } finally {
      setTimeout(() => setMessage(""), 3000);
      setTwoFAState((s) => ({ ...s, disabling: false }));
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/settings/${user.id}`, {
        data: { password: deleteForm.password },
      });
      setConfirmOpen(false);
      setMessage("✅ Account deleted. Redirecting...");
      setTimeout(() => logout(), 2000);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || "Failed to delete account";
      setMessage("❌ " + errorMsg);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading)
    return <div className="p-6 text-center">Loading settings...</div>;

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-secondary mb-6">Settings</h1>

        {message && (
          <div className="p-4 alert-primary rounded-lg mb-6">✅ {message}</div>
        )}

        {error && (
          <div className="p-4 alert-danger rounded-lg mb-6">❌ {error}</div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
          {[
            "account",
            "privacy",
            "notifications",
            "appearance",
            "security",
            "devices",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize font-semibold transition ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 hover:text-secondary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Account Settings */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                � Profile Picture
              </h2>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <img
                    src={
                      profileForm.profilePic ||
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23e5e7eb' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='%239ca3af' dominant-baseline='middle' text-anchor='middle'%3E👤%3C/text%3E%3C/svg%3E"
                    }
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    onError={(e) => {
                      e.target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23e5e7eb' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='%239ca3af' dominant-baseline='middle' text-anchor='middle'%3E👤%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <div>
                  <label className="block">
                    <span className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer">
                      {uploadingAvatar ? "Uploading..." : "Change Photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Max file size: 5MB. Formats: PNG, JPG, GIF, WebP
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                �👤 Profile Information
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    maxLength="150"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    rows="3"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {profileForm.bio.length}/150
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Save Profile
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                📧 Email
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              <button
                disabled
                className="mt-4 px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        {activeTab === "privacy" && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                🔒 Privacy Controls
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-secondary">
                      Private Profile
                    </h3>
                    <p className="text-sm text-gray-600">
                      Only approved followers can see your posts
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.isPrivateProfile || false}
                    onChange={(e) =>
                      handleUpdateSettings("isPrivateProfile", e.target.checked)
                    }
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>

                <hr />

                <div>
                  <h3 className="font-semibold text-secondary mb-3">
                    Who can message you?
                  </h3>
                  <div className="space-y-2">
                    {["everyone", "followers", "none"].map((option) => (
                      <label key={option} className="flex items-center">
                        <input
                          type="radio"
                          name="allowMessages"
                          value={option}
                          checked={settings?.allowMessages === option}
                          onChange={() =>
                            handleUpdateSettings("allowMessages", option)
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="ml-3 capitalize text-gray-700">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-secondary">
                      Allow skill requests from anyone
                    </h3>
                    <p className="text-sm text-gray-600">
                      People can send you skill requests
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.allowRequestsFromAll || false}
                    onChange={(e) =>
                      handleUpdateSettings(
                        "allowRequestsFromAll",
                        e.target.checked
                      )
                    }
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === "notifications" && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              🔔 Notification Preferences
            </h2>
            <div className="space-y-4">
              {[
                {
                  key: "emailNotifications",
                  label: "Email Notifications",
                  icon: "📧",
                },
                {
                  key: "pushNotifications",
                  label: "Push Notifications",
                  icon: "📱",
                },
                {
                  key: "requestNotifications",
                  label: "Skill Request Alerts",
                  icon: "📨",
                },
                {
                  key: "messageNotifications",
                  label: "Message Notifications",
                  icon: "💬",
                },
                {
                  key: "activityNotifications",
                  label: "Activity Updates",
                  icon: "📊",
                },
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-secondary">
                      {icon} {label}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.[key] || false}
                    onChange={(e) =>
                      handleUpdateSettings(key, e.target.checked)
                    }
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === "appearance" && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              🎨 Appearance
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-secondary mb-3">
                  Color Palette
                </h3>
                <select
                  value={settings?.colorPalette || "champagne"}
                  onChange={(e) =>
                    handleUpdateSettings("colorPalette", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-700"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                >
                  <option value="obsidian-blue">
                    1️⃣ Obsidian Blue × Silver (Apple / Fintech)
                  </option>
                  <option value="emerald">
                    2️⃣ Emerald × Graphite (Wealth / Premium)
                  </option>
                  <option value="royal-purple">
                    3️⃣ Royal Purple × Onyx (High-Status Creators)
                  </option>
                  <option value="champagne">
                    4️⃣ Champagne × Charcoal (Fashion / Luxury SaaS)
                  </option>
                  <option value="crimson">
                    5️⃣ Crimson × Jet Black (Power / Exclusivity)
                  </option>
                  <option value="midnight-teal">
                    6️⃣ Midnight Teal × Platinum (Private Bank)
                  </option>
                  <option value="graphite">
                    7️⃣ Graphite × Ice White (Apple Pro / Minimal)
                  </option>
                  <option value="pearl">
                    8️⃣ Pearl × Obsidian (Luxury Fashion / Editorial)
                  </option>
                  <option value="carbon-blue">
                    9️⃣ Carbon × Electric Blue (Futuristic / AI)
                  </option>
                  <option value="mocha">
                    🔟 Mocha × Linen (Calm Luxury / Lifestyle)
                  </option>
                  <option value="bronze">
                    1️⃣1️⃣ Bronze × Ink Black (Old-Money / Legacy)
                  </option>
                  <option value="gold">1️⃣2️⃣ Gold (Black × Gold Premium)</option>
                </select>
                <p
                  className="mt-2 text-sm text-gray-600"
                  style={{ color: "var(--muted)" }}
                >
                  Choose a color palette that matches your style
                </p>
              </div>

              <hr />

              <div>
                <h3 className="font-semibold text-secondary mb-3">Language</h3>
                <select
                  value={settings?.language || "en"}
                  onChange={(e) =>
                    handleUpdateSettings("language", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary bg-white text-gray-700"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                🔐 Two-Factor Authentication (2FA)
              </h2>
              {!user?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Protect your account with a second step at sign-in. You'll
                    use an authenticator app (like Google Authenticator,
                    Microsoft Authenticator, Authy) to generate codes.
                  </p>
                  {!twoFAState.secret ? (
                    <button
                      onClick={startEnable2FA}
                      disabled={twoFAState.isGenerating}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {twoFAState.isGenerating ? "Generating..." : "Enable 2FA"}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <img
                          src={twoFAState.qrCode}
                          alt="2FA QR"
                          className="w-40 h-40 border rounded"
                        />
                        <div className="text-sm text-gray-700">
                          <p className="font-semibold mb-2">Secret (Base32)</p>
                          <div className="p-2 bg-gray-100 rounded break-all select-all">
                            {twoFAState.secret}
                          </div>
                          <p className="mt-2 text-gray-600">
                            Scan the QR in your authenticator app or manually
                            enter the secret.
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter 6-digit code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="^[0-9]{6}$"
                          value={twoFAState.code}
                          onChange={(e) =>
                            setTwoFAState((s) => ({
                              ...s,
                              code: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            }))
                          }
                          placeholder="123456"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={confirmEnable2FA}
                          disabled={twoFAState.enabling}
                          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {twoFAState.enabling ? "Enabling..." : "Activate 2FA"}
                        </button>
                        <button
                          onClick={() =>
                            setTwoFAState({
                              secret: "",
                              qrCode: "",
                              isGenerating: false,
                              code: "",
                              disabling: false,
                              enabling: false,
                            })
                          }
                          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="alert-success p-3 rounded">
                    ✅ 2FA is enabled on your account.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your password to disable
                    </label>
                    <input
                      type="password"
                      value={deleteForm.password}
                      onChange={(e) =>
                        setDeleteForm({
                          ...deleteForm,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={disable2FA}
                    disabled={twoFAState.disabling}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {twoFAState.disabling ? "Disabling..." : "Disable 2FA"}
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                🔐 Change Password
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        oldPassword: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Update Password
                </button>
              </form>
            </div>

            <div className="alert-danger p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-red-600 mb-4">
                ⚠️ Delete Account
              </h2>
              <p className="text-gray-600 mb-4">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!deleteForm.password) {
                    setMessage("❌ Password is required");
                    return;
                  }
                  setConfirmOpen(true);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={deleteForm.password}
                    onChange={(e) =>
                      setDeleteForm({ ...deleteForm, password: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Account Permanently
                </button>
              </form>
              <ConfirmModal
                open={confirmOpen}
                title="Delete Account"
                message="⚠️ Are you sure? This will permanently delete your account and all data."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Device Management */}
        {activeTab === "devices" && <DeviceManagement />}

        {/* Logout Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={logout}
            className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

// Device Management Component
function DeviceManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(new Set());

  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const { sessions: sessionsData, currentDeviceId: deviceId } =
          await enhancementService.getDeviceSessions();
        setSessions(sessionsData || []);
        setCurrentDeviceId(deviceId);
      } catch (error) {
        console.error("Failed to fetch device sessions:", error);
        showToast("Failed to load device sessions", "error");
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchSessions();
    }
  }, [user?.id, showToast]);

  const handleRevokeSession = async (sessionId) => {
    if (
      !window.confirm(
        "Revoke this device session? You'll need to log in again on that device."
      )
    ) {
      return;
    }

    setRevoking((prev) => new Set(prev).add(sessionId));
    try {
      await enhancementService.revokeDeviceSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast("Session revoked", "success");
    } catch (error) {
      console.error("Failed to revoke session:", error);
      showToast("Failed to revoke session", "error");
    } finally {
      setRevoking((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleRevokeAllOther = async () => {
    if (
      !window.confirm(
        "Revoke all other sessions? You'll stay logged in on this device only."
      )
    ) {
      return;
    }

    if (!currentDeviceId) {
      showToast("Unable to identify current device", "error");
      return;
    }

    try {
      await enhancementService.revokeAllOtherSessions(currentDeviceId);
      setSessions((prev) => prev.filter((s) => s.deviceId === currentDeviceId));
      showToast("All other sessions revoked", "success");
    } catch (error) {
      console.error("Failed to revoke all sessions:", error);
      showToast("Failed to revoke sessions", "error");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return "Unknown Device";

    if (userAgent.includes("Mobile")) {
      if (userAgent.includes("iPhone")) return "📱 iPhone";
      if (userAgent.includes("Android")) return "📱 Android";
      return "📱 Mobile Device";
    }
    if (userAgent.includes("Windows")) return "💻 Windows";
    if (userAgent.includes("Mac")) return "💻 Mac";
    if (userAgent.includes("Linux")) return "💻 Linux";
    return "💻 Desktop";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-secondary">
              📱 Active Sessions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage devices where you're logged in
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllOther}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Revoke All Other Sessions
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No active sessions</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getDeviceInfo(session.userAgent).split(" ")[0]}
                    </span>
                    <div>
                      <h3 className="font-semibold text-secondary">
                        {session.deviceName || getDeviceInfo(session.userAgent)}
                      </h3>
                      {session.ipAddress && (
                        <p className="text-sm text-gray-600">
                          IP: {session.ipAddress}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Last active: {formatDate(session.lastActiveAt)}
                      </p>
                      {session.deviceId && (
                        <p className="text-xs text-gray-400 mt-1">
                          Device ID: {session.deviceId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revoking.has(session.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {revoking.has(session.id) ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alert-primary p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> If you notice suspicious activity, revoke all
          sessions and change your password immediately.
        </p>
      </div>
    </div>
  );
}

export default Settings;
