import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import ReportModal from "../components/ReportModal";
import api from "../services/api";
import socket from "../services/socket";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";
import { uploadService } from "../services/api";
import { ReviewSection } from "../components/ReviewSection";
import ProfileStats from "../components/ProfileStats";
import PhotoGallery from "../components/PhotoGallery";
import Achievements from "../components/Achievements";
import SocialLinks from "../components/SocialLinks";
import { enhancementService } from "../services/api";

export default function Profile() {
  const { user: currentUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const { userId } = useParams();
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [user, setUser] = useState(null);
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    followsYou: false,
  });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reportModal, setReportModal] = useState({ isOpen: false });
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    course: "",
    year: "",
    profilePic: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isOwnProfile) {
          setUser(currentUser);
          setEditForm({
            name: currentUser?.name || "",
            bio: currentUser?.bio || "",
            course: currentUser?.course || "",
            year: currentUser?.year || "",
            profilePic: currentUser?.profilePic || "",
          });
          // Fetch own skills
          try {
            const { data: skillsData } = await api.get(
              `/skills?userId=${currentUser?.id}`
            );
            setSkills(skillsData || []);
          } catch (err) {
            console.error("Failed to fetch skills:", err);
          }
          setLoading(false);
        } else {
          const { data } = await api.get(`/users/${userId}`);
          setUser(data);
          const { data: status } = await api.get(
            `/users/${userId}/follow-status`
          );
          setFollowStatus(status);
          // Track profile view
          if (currentUser?.id && currentUser.id !== userId) {
            try {
              await enhancementService.trackProfileView(userId);
            } catch (err) {
              console.error("Failed to track profile view:", err);
            }
          }
          // Fetch user's skills
          try {
            const { data: skillsData } = await api.get(
              `/skills?userId=${userId}`
            );
            setSkills(skillsData || []);
          } catch (err) {
            console.error("Failed to fetch skills:", err);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        showToast("Failed to load profile", "error");
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser, isOwnProfile, showToast]);

  // Listen for real-time follow/unfollow events
  useEffect(() => {
    if (!userId || isOwnProfile) return;

    const handleUserFollowed = ({ followingId }) => {
      if (followingId === userId) {
        setUser((prev) =>
          prev
            ? { ...prev, followersCount: (prev.followersCount || 0) + 1 }
            : prev
        );
      }
    };

    const handleUserUnfollowed = ({ followingId }) => {
      if (followingId === userId) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                followersCount: Math.max((prev.followersCount || 0) - 1, 0),
              }
            : prev
        );
      }
    };

    socket.on("user_followed", handleUserFollowed);
    socket.on("user_unfollowed", handleUserUnfollowed);

    return () => {
      socket.off("user_followed", handleUserFollowed);
      socket.off("user_unfollowed", handleUserUnfollowed);
    };
  }, [userId, isOwnProfile]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditForm({
        name: user?.name || "",
        bio: user?.bio || "",
        course: user?.course || "",
        year: user?.year || "",
        profilePic: user?.profilePic || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data } = await api.put(`/users/${currentUser.id}`, editForm);
      setUser(data);
      setIsEditing(false);
    updateUser(data); // Update AuthContext
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, user: updated } = await uploadService.uploadProfilePic(file);
      setEditForm((prev) => ({ ...prev, profilePic: url }));
      if (updated) {
        setUser(updated);
      updateUser(updated); // Update AuthContext
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || newSkill.trim().length < 2) {
      showToast("Skill name must be at least 2 characters", "error");
      return;
    }

    try {
      const { data } = await api.post("/skills", {
        title: newSkill.trim(),
      });
      setSkills([...skills, data]);
      setNewSkill("");
      showToast("Skill added", "success");
    } catch (error) {
      console.error("Failed to add skill:", error);
      showToast(
        error?.response?.data?.message || "Failed to add skill",
        "error"
      );
    }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      await api.delete(`/skills/${skillId}`);
      setSkills(skills.filter((s) => s.id !== skillId));
      showToast("Skill removed", "success");
    } catch (error) {
      console.error("Failed to remove skill:", error);
      showToast("Failed to remove skill", "error");
    }
  };

  const handleFollowToggle = async () => {
    if (updating) return;

    setUpdating(true);
    const wasFollowing = followStatus.isFollowing;

    setFollowStatus({ ...followStatus, isFollowing: !wasFollowing });
    setUser({
      ...user,
      followersCount: user.followersCount + (wasFollowing ? -1 : 1),
    });

    try {
      if (wasFollowing) {
        await api.delete(`/users/${userId}/follow`);
        showToast("Unfollowed", "success");
      } else {
        await api.post(`/users/${userId}/follow`);
        showToast("Followed", "success");
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      showToast("Failed to update follow", "error");
      setFollowStatus({ ...followStatus, isFollowing: wasFollowing });
      setUser({
        ...user,
        followersCount: user.followersCount + (wasFollowing ? 1 : -1),
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <SkeletonLoader type="profile" />
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 flex items-center justify-between">
            <span>Loading profile...</span>
            <button
              onClick={async () => {
                try {
                  const { data } = await api.get(`/users/${userId}`);
                  setUser(data);
                  showToast("Profile refreshed", "success");
                } catch (e) {
                  console.error("Retry failed:", e);
                  showToast("Failed to load profile", "error");
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-start mb-6">
            <img
              src={user.profilePic || "https://placehold.co/128x128?text=User"}
              alt={user.name || "User avatar"}
              className="w-32 h-32 rounded-full mr-6 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-secondary">
                  {user.name}
                </h1>
                <div className="flex items-center gap-2">
                  {!isOwnProfile && (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        disabled={updating}
                        className={`px-6 py-2 rounded-lg font-semibold transition ${
                          followStatus.isFollowing
                            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            : "bg-primary text-white hover:bg-blue-600"
                        } disabled:opacity-50`}
                      >
                        {updating
                          ? "Updating..."
                          : followStatus.isFollowing
                          ? "Following"
                          : "Follow"}
                      </button>
                      <button
                        onClick={() => setReportModal({ isOpen: true })}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        title="Report user"
                      >
                        🚩
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-2">{user.email}</p>
              {user.course && <p className="text-gray-600">{user.course}</p>}
              {user.year && <p className="text-gray-600">Year {user.year}</p>}

              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-secondary">
                    {user.postsCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Posts</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-80">
                  <p className="text-xl font-bold text-secondary">
                    {user.followersCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-80">
                  <p className="text-xl font-bold text-secondary">
                    {user.followingCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              </div>

              {followStatus.followsYou && !isOwnProfile && (
                <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  Follows you
                </span>
              )}
            </div>
          </div>

          {!isEditing && user.bio && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-secondary mb-2">Bio</h2>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}

          {/* Verification Badge */}
          {user.emailVerified && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified Account
              </span>
            </div>
          )}

          {/* Social Links */}
          <SocialLinks
            user={user}
            isOwnProfile={isOwnProfile}
            onUpdate={(updatedLinks) => {
              setUser({ ...user, ...updatedLinks });
            }}
          />

          {/* Profile Stats */}
          <ProfileStats userId={user.id} />

          {/* Achievements */}
          <Achievements userId={user.id} />

          {/* Photo Gallery */}
          <PhotoGallery userId={user.id} isOwnProfile={isOwnProfile} />

          {/* Skills Section */}
          {skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-secondary mb-3">
                💼 Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{skill.title}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="ml-1 hover:text-blue-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section (viewable for everyone; only others can post) */}
          {user && (
            <ReviewSection
              userId={user.id}
              currentUserId={currentUser?.id}
              canReview={currentUser?.id && currentUser?.id !== user.id}
            />
          )}

          {isOwnProfile && !isEditing && (
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={handleEditToggle}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Edit Profile
              </button>
            </div>
          )}

          {isOwnProfile && isEditing && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-secondary mb-4">
                Edit Profile
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <input
                    type="text"
                    value={editForm.course}
                    onChange={(e) =>
                      setEditForm({ ...editForm, course: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm({ ...editForm, year: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Picture
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="w-full text-sm text-gray-700"
                    />
                    <input
                      type="url"
                      value={editForm.profilePic}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          profilePic: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                      placeholder="https://example.com/avatar.jpg"
                    />
                    {editForm.profilePic && (
                      <img
                        src={editForm.profilePic}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border"
                      />
                    )}
                  </div>
                </div>

                {/* Skills Management */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💼 Skills
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                      placeholder="Add a skill (e.g., React, Python, Design)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                      Add
                    </button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          <span>{skill.title}</span>
                          <button
                            onClick={() => handleRemoveSkill(skill.id)}
                            className="ml-1 hover:text-red-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleEditToggle}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <ReportModal
          isOpen={reportModal.isOpen}
          onClose={() => setReportModal({ isOpen: false })}
          targetType="User"
          targetId={user.id}
          targetName={user.name}
        />{" "}
      </div>
    </PageTransition>
  );
}
