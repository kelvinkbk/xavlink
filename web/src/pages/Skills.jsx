import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  skillService,
  requestService,
  enhancementService,
} from "../services/api";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";

function SkillCard({
  skill,
  onRequest,
  currentUserId,
  onEndorse,
  onViewCertifications,
}) {
  const [endorsed, setEndorsed] = useState(false);
  const [endorsementCount, setEndorsementCount] = useState(
    skill.endorsementCount || 0
  );

  const proficiencyColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    expert: "bg-red-100 text-red-800",
  };

  const handleEndorse = async () => {
    if (!currentUserId || currentUserId === skill.userId) return;

    try {
      if (endorsed) {
        await enhancementService.removeEndorsement(skill.id);
        setEndorsed(false);
        setEndorsementCount((prev) => Math.max(0, prev - 1));
      } else {
        await enhancementService.endorseSkill(skill.id);
        setEndorsed(true);
        setEndorsementCount((prev) => prev + 1);
      }
      if (onEndorse) onEndorse();
    } catch (error) {
      console.error("Failed to toggle endorsement:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-secondary text-lg">
            {skill.title}
          </h3>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
              {skill.category}
            </span>
            {skill.subcategory && (
              <span className="inline-block bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                {skill.subcategory}
              </span>
            )}
            {skill.proficiency && (
              <span
                className={`inline-block text-xs font-semibold px-2 py-1 rounded capitalize ${
                  proficiencyColors[skill.proficiency] ||
                  proficiencyColors.beginner
                }`}
              >
                {skill.proficiency}
              </span>
            )}
          </div>
        </div>
        {skill.priceRange && (
          <p className="text-primary font-semibold ml-2">{skill.priceRange}</p>
        )}
      </div>

      <p className="text-gray-600 text-sm mb-3">{skill.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{skill.user?.name}</span>
          {endorsementCount > 0 && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <span>👍</span>
              <span>{endorsementCount}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentUserId && currentUserId === skill.userId && (
            <button
              onClick={() => onViewCertifications(skill)}
              className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 transition"
              title="View certifications"
            >
              📜 Certifications
            </button>
          )}
          {currentUserId && currentUserId !== skill.userId && (
            <button
              onClick={handleEndorse}
              className={`px-3 py-1 rounded text-sm transition ${
                endorsed
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={endorsed ? "Remove endorsement" : "Endorse this skill"}
            >
              👍 {endorsed ? "Endorsed" : "Endorse"}
            </button>
          )}
          <button
            onClick={() => onRequest(skill)}
            className="bg-primary text-white px-4 py-1 rounded text-sm hover:bg-blue-600 transition"
          >
            Request Skill
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Skills() {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [newSkill, setNewSkill] = useState({
    title: "",
    description: "",
    category: "Web Development",
    subcategory: "",
    priceRange: "",
    proficiency: "beginner",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Request modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [requestingSkill, setRequestingSkill] = useState(false);

  // Certification states
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [selectedSkillForCert, setSelectedSkillForCert] = useState(null);
  const [certifications, setCertifications] = useState({});
  const [newCertification, setNewCertification] = useState({
    certificateTitle: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    credentialUrl: "",
  });
  const [addingCert, setAddingCert] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const { data } = await skillService.searchSkills(search);
        setSkills(data);
      } catch (e) {
        console.error("Error fetching skills:", e);
        setError("Failed to load skills");
        showToast("Failed to load skills", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [search, showToast]);

  // Fetch templates when authenticated
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!isAuthenticated) return;
      try {
        const { templates: templatesData } =
          await enhancementService.getRequestTemplates();
        setTemplates(templatesData || []);
      } catch (e) {
        console.error("Error fetching templates:", e);
      }
    };
    fetchTemplates();
  }, [isAuthenticated]);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await skillService.addSkill(newSkill);
      setNewSkill({
        title: "",
        description: "",
        category: "Web Development",
        subcategory: "",
        priceRange: "",
        proficiency: "beginner",
      });
      setShowForm(false);
      // Refetch skills after adding new skill
      const { data } = await skillService.searchSkills(search);
      setSkills(data);
      showToast("Skill added", "success");
    } catch (e) {
      console.error("Error adding skill:", e);
      setError(e.response?.data?.message || "Failed to add skill");
      showToast(e.response?.data?.message || "Failed to add skill", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSkill = (skill) => {
    if (!isAuthenticated) {
      showToast("Please login to request skills", "error");
      return;
    }
    setSelectedSkill(skill);
    setCustomMessage("");
    setSelectedTemplate(null);
    setShowRequestModal(true);
  };

  const handleConfirmRequest = async () => {
    if (!selectedSkill) return;

    let message = "";
    if (selectedTemplate) {
      message = selectedTemplate.message;
    } else if (customMessage) {
      message = customMessage;
    }

    setRequestingSkill(true);
    try {
      await requestService.sendRequest({
        toUserId: selectedSkill.userId,
        skillId: selectedSkill.id,
        message: message || undefined,
      });
      showToast(`Request sent for "${selectedSkill.title}"!`, "success");
      setShowRequestModal(false);
      setSelectedSkill(null);
      setCustomMessage("");
      setSelectedTemplate(null);
    } catch (e) {
      console.error("Error requesting skill:", e);
      showToast(e.response?.data?.message || "Failed to send request", "error");
    } finally {
      setRequestingSkill(false);
    }
  };

  const handleAddCertification = async () => {
    if (
      !newCertification.certificateTitle.trim() ||
      !newCertification.issuingOrganization.trim() ||
      !newCertification.issueDate
    ) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setAddingCert(true);
    try {
      await enhancementService.addCertification(
        selectedSkillForCert.id,
        newCertification
      );
      showToast("Certification added", "success");
      setShowCertificationModal(false);
      setNewCertification({
        certificateTitle: "",
        issuingOrganization: "",
        issueDate: "",
        expiryDate: "",
        credentialUrl: "",
      });
      // Refetch certifications
      const { certifications: certsData } =
        await enhancementService.getSkillCertifications(
          selectedSkillForCert.id
        );
      setCertifications({
        ...certifications,
        [selectedSkillForCert.id]: certsData || [],
      });
    } catch (e) {
      console.error("Error adding certification:", e);
      showToast("Failed to add certification", "error");
    } finally {
      setAddingCert(false);
    }
  };

  const handleOpenCertificationsModal = async (skill) => {
    setSelectedSkillForCert(skill);
    try {
      if (!certifications[skill.id]) {
        const { certifications: certsData } =
          await enhancementService.getSkillCertifications(skill.id);
        setCertifications({
          ...certifications,
          [skill.id]: certsData || [],
        });
      }
    } catch (e) {
      console.error("Error fetching certifications:", e);
    }
    setShowCertificationModal(true);
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-secondary">
            Skills Marketplace
          </h1>
          {isAuthenticated && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              {showForm ? "Cancel" : "Add Skill"}
            </button>
          )}
        </div>

        {showForm && isAuthenticated && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold text-secondary mb-4">
              Add New Skill
            </h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skill Title
                </label>
                <input
                  type="text"
                  value={newSkill.title}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, description: e.target.value })
                  }
                  required
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={newSkill.category}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option>Web Development</option>
                    <option>Mobile Development</option>
                    <option>Data Science</option>
                    <option>UI/UX Design</option>
                    <option>Tutoring</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subcategory (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSkill.subcategory}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, subcategory: e.target.value })
                    }
                    placeholder="e.g., React, Python, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Proficiency Level
                  </label>
                  <select
                    value={newSkill.proficiency}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, proficiency: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price Range
                  </label>
                  <input
                    type="text"
                    value={newSkill.priceRange}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, priceRange: e.target.value })
                    }
                    placeholder="e.g., ₹150-200/hr"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold disabled:opacity-50"
              >
                {submitting ? "Adding Skill..." : "Add Skill"}
              </button>
            </form>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search skills by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          </div>
        ) : skills.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">
              No skills found. Try a different search.
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const { data } = await skillService.searchSkills(search);
                  setSkills(data);
                  showToast("Skills refreshed", "success");
                } catch (e) {
                  console.error("Refresh failed:", e);
                  setError("Failed to load skills");
                  showToast("Failed to load skills", "error");
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onRequest={handleRequestSkill}
                currentUserId={user?.id}
                onViewCertifications={handleOpenCertificationsModal}
              />
            ))}
          </div>
        )}

        {/* Request Modal */}
        {showRequestModal && selectedSkill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-secondary mb-2">
                Request Skill
              </h2>
              <p className="text-gray-600 mb-4">
                {selectedSkill.title} from {selectedSkill.user?.name}
              </p>

              {/* Template Selection */}
              {templates.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-secondary mb-2">
                    Use Template
                  </h3>
                  <select
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => {
                      const template = templates.find(
                        (t) => t.id === e.target.value
                      );
                      setSelectedTemplate(template || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">None - Write custom message</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-800">
                        {selectedTemplate.message}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Message */}
              {!selectedTemplate && (
                <div className="mb-4">
                  <h3 className="font-semibold text-secondary mb-2">
                    Message (Optional)
                  </h3>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedSkill(null);
                  }}
                  disabled={requestingSkill}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRequest}
                  disabled={requestingSkill}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestingSkill ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Certification Modal */}
        {showCertificationModal && selectedSkillForCert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-secondary mb-2">
                Certifications
              </h2>
              <p className="text-gray-600 mb-6">{selectedSkillForCert.title}</p>

              {/* Add Certification Form */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-secondary mb-4">
                  Add New Certification
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Title *
                    </label>
                    <input
                      type="text"
                      value={newCertification.certificateTitle}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          certificateTitle: e.target.value,
                        })
                      }
                      placeholder="e.g., AWS Certified Solutions Architect"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Organization *
                    </label>
                    <input
                      type="text"
                      value={newCertification.issuingOrganization}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          issuingOrganization: e.target.value,
                        })
                      }
                      placeholder="e.g., Amazon Web Services"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Date *
                      </label>
                      <input
                        type="date"
                        value={newCertification.issueDate}
                        onChange={(e) =>
                          setNewCertification({
                            ...newCertification,
                            issueDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={newCertification.expiryDate}
                        onChange={(e) =>
                          setNewCertification({
                            ...newCertification,
                            expiryDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credential URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={newCertification.credentialUrl}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          credentialUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleAddCertification}
                    disabled={addingCert}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingCert ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Adding...
                      </>
                    ) : (
                      "Add Certification"
                    )}
                  </button>
                </div>
              </div>

              {/* Certifications List */}
              {certifications[selectedSkillForCert.id] &&
              certifications[selectedSkillForCert.id].length > 0 ? (
                <div>
                  <h3 className="font-semibold text-secondary mb-4">
                    Your Certifications
                  </h3>
                  <div className="space-y-3">
                    {certifications[selectedSkillForCert.id].map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-secondary">
                              {cert.certificateTitle}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {cert.issuingOrganization}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Issued:{" "}
                              {new Date(cert.issueDate).toLocaleDateString()}
                              {cert.expiryDate &&
                                ` • Expires: ${new Date(
                                  cert.expiryDate
                                ).toLocaleDateString()}`}
                            </p>
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-sm mt-2 inline-block hover:underline"
                              >
                                View Credential →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6">
                  No certifications yet
                </p>
              )}

              <button
                onClick={() => setShowCertificationModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
