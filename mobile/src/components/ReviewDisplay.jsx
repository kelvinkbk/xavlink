import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export function ReviewDisplay({
  review,
  currentUserId,
  onEdit,
  onDelete,
  isPostReview,
}) {
  const { theme } = useTheme();
  const isOwn = review.author.id === currentUserId;

  const styles = StyleSheet.create({
    container: {
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    authorInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      gap: 8,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.placeholder,
    },
    authorName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    date: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    actionText: {
      fontSize: 12,
      fontWeight: "500",
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    stars: {
      fontSize: 14,
    },
    ratingValue: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.text,
    },
    comment: {
      fontSize: 13,
      color: theme.text,
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Image
            source={{
              uri: review.author.profilePic || "https://via.placeholder.com/40",
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.authorName}>{review.author.name}</Text>
            <Text style={styles.date}>
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isOwn && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#EFF6FF" }]}
              onPress={() => onEdit(review)}
            >
              <Text style={[styles.actionText, { color: "#2563EB" }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#FEE2E2" }]}
              onPress={() => onDelete(review.id)}
            >
              <Text style={[styles.actionText, { color: "#DC2626" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={styles.ratingContainer}>
        <Text style={styles.stars}>
          {String(
            [...Array(5)]
              .map((_, i) => (i < review.rating ? "★" : "☆"))
              .join(""),
          )}
        </Text>
        <Text style={styles.ratingValue}>{String(review.rating)}/5</Text>
      </View>

      {/* Comment */}
      {review.comment && <Text style={styles.comment}>{review.comment}</Text>}
    </View>
  );
}
