import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Text,
  ScrollView,
  Image,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { postService, uploadService } from "../services/api";

const CreatePostModal = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access photos is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = uri.split("/").pop() || "upload.jpg";
    const ext = name.split(".").pop();
    const type = ext ? `image/${ext}` : "image/jpeg";

    const formData = new FormData();
    formData.append("image", { uri, name, type });

    setUploading(true);
    setError("");
    try {
      const { url } = await uploadService.uploadPostImage(formData);
      setImageUrl(url);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim()) {
      setError("Post content is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await postService.createPost({
        content: content.trim(),
        image: imageUrl.trim() || null,
      });
      setContent("");
      setImageUrl("");
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Post
          </Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={loading || !content.trim()}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 16,
                fontWeight: "600",
                opacity: loading || !content.trim() ? 0.5 : 1,
              }}
            >
              Post
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.error }]}>
              <Text style={{ color: "white" }}>{error}</Text>
            </View>
          )}

          <TextInput
            style={[
              styles.contentInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
            editable={!loading}
          />

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={pickImage}
              disabled={uploading || loading}
            >
              <Text style={{ color: colors.text }}>
                {uploading ? "Uploading..." : "Pick Image"}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              placeholder="Image URL (optional)"
              placeholderTextColor={colors.textSecondary}
              value={imageUrl}
              onChangeText={setImageUrl}
              editable={!loading}
            />
          </View>

          {imageUrl.trim() && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: 200, borderRadius: 8 }}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: "top",
    minHeight: 120,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  uploadButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  imagePreview: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
});

export default CreatePostModal;
