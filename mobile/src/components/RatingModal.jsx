import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export function RatingModal({
  visible,
  userId,
  postId,
  onClose,
  onSubmit,
  existingReview,
}) {
  const { theme } = useTheme();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ rating, comment });
      setRating(0);
      setComment("");
      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalView: {
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      width: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 16,
    },
    starsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginBottom: 16,
    },
    star: {
      fontSize: 40,
      padding: 8,
    },
    ratingText: {
      color: theme.textSecondary,
      marginBottom: 12,
      fontSize: 14,
    },
    textInput: {
      width: "100%",
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: theme.text,
      maxHeight: 120,
      textAlignVertical: "top",
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    submitButton: {
      backgroundColor: "#3B82F6",
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>{userId ? "Rate User" : "Rate Post"}</Text>

          {/* Stars */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={{ padding: 8 }}
              >
                <Text
                  style={[
                    styles.star,
                    { color: star <= rating ? "#FBBF24" : "#D1D5DB" },
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingText}>{String(rating)} out of 5 stars</Text>
          )}

          {/* Comment Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Add a comment (optional)"
            placeholderTextColor={theme.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            editable={!loading}
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (loading || rating === 0) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={loading || rating === 0}
            >
              <Text style={[styles.buttonText, { color: "white" }]}>
                {loading
                  ? "Submitting..."
                  : existingReview
                  ? "Update"
                  : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
