import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api, { uploadService, twoFactorService } from "../services/api";
import PageTransition from "../components/PageTransition";
import ConfirmModal from "../components/ConfirmModal";

const Settings = () => {
  const { user, isAuthenticated, logout, token, login } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const applyTheme = (themeValue) => {
    if (!themeValue) return;
    document.documentElement.dataset.theme = themeValue;
    localStorage.setItem("theme", themeValue);
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
        applyTheme(data?.theme || "light");
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
      if (key === "theme") {
        applyTheme(value);
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
          <div className="p-4 bg-blue-50 border border-primary rounded-lg mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300">
          {[
            "account",
            "privacy",
            "notifications",
            "appearance",
            "security",
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
                <h3 className="font-semibold text-secondary mb-3">Theme</h3>
                <div className="space-y-2">
                  {["light", "dark", "auto"].map((theme) => (
                    <label key={theme} className="flex items-center">
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={settings?.theme === theme}
                        onChange={() => handleUpdateSettings("theme", theme)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="ml-3 capitalize text-gray-700">
                        {theme}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <hr />

              <div>
                <h3 className="font-semibold text-secondary mb-3">Language</h3>
                <select
                  value={settings?.language || "en"}
                  onChange={(e) =>
                    handleUpdateSettings("language", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
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
                  <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded">
                    2FA is enabled on your account.
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

            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
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

export default Settings;
