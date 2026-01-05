import React, { useState, useEffect, useCallback } from "react";
import { RatingModal } from "./RatingModal";
import { ReviewDisplay } from "./ReviewDisplay";
import { reviewService } from "../services/api";

export function ReviewSection({
  userId,
  postId,
  currentUserId,
  canReview = true,
}) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userReview, setUserReview] = useState(null);

  const isPostReview = !!postId;

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = isPostReview
        ? await reviewService.getPostReviews(postId)
        : await reviewService.getUserReviews(userId);

      setReviews(data.reviews || []);
      setAvgRating(data.avgRating || 0);

      // Find user's own review
      const myReview = data.reviews?.find((r) => r.author.id === currentUserId);
      setUserReview(myReview || null);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, postId, isPostReview, currentUserId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (reviewData) => {
    if (!canReview) return;
    try {
      if (isPostReview) {
        if (userReview) {
          await reviewService.updatePostReview(userReview.id, reviewData);
        } else {
          await reviewService.createPostReview(postId, reviewData);
        }
      } else {
        if (userReview) {
          await reviewService.updateUserReview(userReview.id, reviewData);
        } else {
          await reviewService.createUserReview(userId, reviewData);
        }
      }
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (confirm("Delete this review?")) {
      try {
        if (isPostReview) {
          await reviewService.deletePostReview(reviewId);
        } else {
          await reviewService.deleteUserReview(reviewId);
        }
        fetchReviews();
      } catch (error) {
        console.error("Error deleting review:", error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading reviews...</div>;
  }

  return (
    <div className="my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold mb-1">Reviews</h3>
          <div className="flex items-center gap-3">
            <div className="flex text-yellow-400 text-lg">
              {[...Array(5)].map((_, i) => (
                <span key={i}>{i < Math.round(avgRating) ? "★" : "☆"}</span>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {avgRating}/5 ({reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>

        {canReview && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {userReview ? "Edit Review" : "Write Review"}
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <ReviewDisplay
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              onEdit={() => {
                setUserReview(review);
                setShowModal(true);
              }}
              onDelete={handleDeleteReview}
              isPostReview={isPostReview}
            />
          ))
        )}
      </div>

      {/* Rating Modal */}
      {showModal && canReview && (
        <RatingModal
          userId={!isPostReview ? userId : undefined}
          postId={isPostReview ? postId : undefined}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitReview}
          existingReview={userReview}
        />
      )}
    </div>
  );
}
