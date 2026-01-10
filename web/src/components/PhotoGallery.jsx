import { useState, useEffect } from "react";
import { enhancementService, uploadService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "./LoadingSpinner";

export default function PhotoGallery({ userId, isOwnProfile = false }) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { photos: photosData } = await enhancementService.getUserPhotos(userId);
        setPhotos(photosData || []);
      } catch (error) {
        console.error("Failed to fetch photos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPhotos();
    }
  }, [userId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadService.uploadPostImage(file);
      const { photo } = await enhancementService.addUserPhoto({
        url,
        caption: "",
      });
      setPhotos((prev) => [...prev, photo]);
      showToast("Photo added successfully", "success");
    } catch (error) {
      console.error("Failed to upload photo:", error);
      showToast("Failed to upload photo", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    try {
      await enhancementService.deleteUserPhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      showToast("Photo deleted", "success");
    } catch (error) {
      console.error("Failed to delete photo:", error);
      showToast("Failed to delete photo", "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-secondary">Photo Gallery</h2>
          {isOwnProfile && (
            <label className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer">
              {uploading ? "Uploading..." : "Add Photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {photos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {isOwnProfile ? "No photos yet. Add your first photo!" : "No photos available"}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Gallery photo"}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {isOwnProfile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || "Gallery photo"}
                className="w-full h-auto"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {selectedPhoto.caption && (
              <div className="p-4">
                <p className="text-gray-700">{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
