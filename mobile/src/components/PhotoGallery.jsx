import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { enhancementService, uploadService } from "../services/api";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = (width - 48) / 3;

const PhotoGallery = ({ userId, isOwnProfile = false }) => {
  const { colors } = useTheme();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    fetchPhotos();
  }, [userId]);

  const fetchPhotos = async () => {
    try {
      const { photos: photosData } =
        await enhancementService.getUserPhotos(userId);
      setPhotos(photosData || []);
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri,
        name: filename,
        type,
      });

      const { url } = await uploadService.uploadPostImage(formData);
      const { photo } = await enhancementService.addUserPhoto({
        url,
        caption: "",
      });
      setPhotos((prev) => [...prev, photo]);
      Alert.alert("Success", "Photo added successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await enhancementService.deleteUserPhoto(photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            setSelectedPhoto(null);
            Alert.alert("Success", "Photo deleted");
          } catch (error) {
            Alert.alert("Error", "Failed to delete photo");
          }
        },
      },
    ]);
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedPhoto(item)}
      style={styles.photoItem}
    >
      <Image source={{ uri: item.url }} style={styles.photo} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Photo Gallery
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>
              {uploading ? "Uploading..." : "+ Add Photo"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {photos.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No photos yet
        </Text>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setSelectedPhoto(null)}
          />
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedPhoto?.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setSelectedPhoto(null)}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Close
                </Text>
              </TouchableOpacity>
              {isOwnProfile && (
                <TouchableOpacity
                  onPress={() => deletePhoto(selectedPhoto.id)}
                  style={[styles.modalButton, { backgroundColor: "#ef4444" }]}
                >
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  photoItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "90%",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: 400,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PhotoGallery;
