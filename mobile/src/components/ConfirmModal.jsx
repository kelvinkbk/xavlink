import React from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}
      >
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {title && (
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>
          )}
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text
                style={[styles.buttonText, { color: colors.textSecondary }]}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: isDangerous ? "#ef4444" : colors.primary,
                },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, { color: "#fff" }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    minWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ConfirmModal;
