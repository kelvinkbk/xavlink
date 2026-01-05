import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { RatingModal } from "./RatingModal";
import { ReviewDisplay } from "./ReviewDisplay";
import { reviewService } from "../services/api";

export function ReviewSection({
  userId,
  postId,
  currentUserId,
  canReview = true,
}) {
  const { theme } = useTheme();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userReview, setUserReview] = useState(null);

  const isPostReview = !!postId;

  useEffect(() => {
    if (authLoading) return; // wait for token bootstrap
    if (!isAuthenticated) {
      // If not authenticated, avoid hitting protected endpoints
      setLoading(false);
      setReviews([]);
      setAvgRating(0);
      return;
    }
    fetchReviews();
  }, [userId, postId, authLoading, isAuthenticated]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError("");
      const data = isPostReview
        ? await reviewService.getPostReviews(postId)
        : await reviewService.getUserReviews(userId);

      setReviews(data.reviews || []);
      setAvgRating(parseFloat(data.avgRating) || 0);

      // Find user's own review
      const myReview = data.reviews?.find((r) => r.author.id === currentUserId);
      setUserReview(myReview || null);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Gracefully handle 401 by clearing and showing empty state
      if (error?.response?.status === 401) {
        setReviews([]);
        setAvgRating(0);
        setError("Sign in to view reviews.");
      } else {
        setError(error?.response?.data?.message || "Failed to load reviews");
      }
    } finally {
      setLoading(false);
    }
  };

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
    if (
      await new Promise((resolve) => {
        Alert.alert("Delete Review", "Are you sure?", [
          { text: "Cancel", onPress: () => resolve(false) },
          {
            text: "Delete",
            onPress: () => resolve(true),
            style: "destructive",
          },
        ]);
      })
    ) {
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

  const styles = StyleSheet.create({
    container: {
      marginVertical: 16,
    },
    header: {
      marginBottom: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    titleSection: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stars: {
      fontSize: 14,
    },
    ratingText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    writeButton: {
      backgroundColor: "#3B82F6",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    writeButtonText: {
      color: "white",
      fontSize: 13,
      fontWeight: "600",
    },
    emptyText: {
      textAlign: "center",
      color: theme.textSecondary,
      paddingVertical: 16,
      fontSize: 14,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && (
        <Text style={[styles.emptyText, { color: theme.danger }]}>{error}</Text>
      )}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Reviews</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.stars}>
              {[...Array(5)]
                .map((_, i) => (i < Math.round(avgRating) ? "★" : "☆"))
                .join("")}
            </Text>
            <Text style={styles.ratingText}>
              {avgRating}/5 ({reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"})
            </Text>
          </View>
        </View>

        {canReview && (
          <TouchableOpacity
            style={styles.writeButton}
            onPress={() => setShowModal(true)}
          >
            <Text style={styles.writeButtonText}>
              {userReview ? "Edit" : "Review"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Text style={styles.emptyText}>No reviews yet</Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReviewDisplay
              review={item}
              currentUserId={currentUserId}
              onEdit={() => {
                if (!canReview) return;
                setUserReview(item);
                setShowModal(true);
              }}
              onDelete={handleDeleteReview}
              isPostReview={isPostReview}
            />
          )}
          scrollEnabled={false}
        />
      )}

      {/* Rating Modal */}
      <RatingModal
        visible={canReview && showModal}
        userId={!isPostReview ? userId : undefined}
        postId={isPostReview ? postId : undefined}
        onClose={() => {
          setShowModal(false);
          setUserReview(null);
        }}
        onSubmit={handleSubmitReview}
        existingReview={userReview}
      />
    </View>
  );
}
