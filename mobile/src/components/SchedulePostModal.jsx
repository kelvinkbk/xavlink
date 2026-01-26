import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { enhancementService, uploadService } from "../services/api";

const SchedulePostModal = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const handleSchedulePost = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Post content is required");
      return;
    }

    if (scheduledDate <= new Date()) {
      Alert.alert("Error", "Scheduled time must be in the future");
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = null;

      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        });

        const uploadResult = await uploadService.uploadPostImage(formData);
        imageUrl = uploadResult.url;
      }

      await enhancementService.schedulePost({
        content,
        imageUrl,
        scheduledAt: scheduledDate.toISOString(),
      });

      Alert.alert("Success", "Post scheduled successfully!");
      setContent("");
      setImageUri(null);
      setScheduledDate(new Date());
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to schedule post"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View
            style={[styles.header, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Schedule Post
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Post Content
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Image (Optional)
              </Text>
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <TouchableOpacity
                    onPress={removeImage}
                    style={styles.removeImageBtn}
                  >
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  style={[
                    styles.uploadBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.uploadText, { color: colors.primary }]}>
                    📷 Pick Image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Schedule For
              </Text>

              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[
                    styles.dateTimeBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>
                    📅
                  </Text>
                  <Text style={[styles.btnText, { color: colors.textPrimary }]}>
                    {formatDate(scheduledDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={[
                    styles.dateTimeBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>
                    🕐
                  </Text>
                  <Text style={[styles.btnText, { color: colors.textPrimary }]}>
                    {formatTime(scheduledDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onTimeChange}
                />
              )}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSchedulePost}
              disabled={isLoading}
              style={[
                styles.button,
                styles.scheduleButton,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.scheduleButtonText}>Schedule Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  uploadBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    borderStyle: "dashed",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeImageBtn: {
    backgroundColor: "#ef4444",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  removeImageText: {
    color: "#fff",
    fontWeight: "600",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  btnLabel: {
    fontSize: 16,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  scheduleButton: {
    // backgroundColor set from theme
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scheduleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SchedulePostModal;
