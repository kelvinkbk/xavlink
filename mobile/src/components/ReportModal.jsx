import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { reportService } from "../services/api";

const ReportModal = ({
  visible,
  onClose,
  targetType,
  targetId,
  targetName,
}) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    { value: "", label: "Select a reason..." },
    { value: "spam", label: "Spam or misleading" },
    { value: "harassment", label: "Harassment or bullying" },
    { value: "inappropriate_content", label: "Inappropriate content" },
    { value: "misinformation", label: "Misinformation" },
    { value: "copyright", label: "Copyright issue" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert("Error", "Please select a reason");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert("Error", "Description must be at least 10 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reason,
        description: description.trim(),
      };
      if (targetType === "User") {
        payload.reportedUserId = targetId;
      } else if (targetType === "Post") {
        payload.reportedPostId = targetId;
      }
      await reportService.createReport(payload);
      Alert.alert("Success", "Report submitted successfully");
      handleClose();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to submit report",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={styles.overlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modal}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetType}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.subtitle}>
              Help us understand what's wrong with this{" "}
              {targetType.toLowerCase()}.
              {targetName && (
                <Text style={styles.targetName}>{"\n" + targetName}</Text>
              )}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Reason for reporting <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={reason}
                  onValueChange={setReason}
                  style={styles.picker}
                >
                  {reasons.map((r) => (
                    <Picker.Item
                      key={r.value}
                      label={r.label}
                      value={r.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Additional details <Text style={styles.required}>*</Text> (min.
                10 chars)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Provide more context..."
                multiline
                numberOfLines={4}
                maxLength={500}
                style={styles.textarea}
              />
              <Text style={styles.charCount}>
                {String(description.length)}/500 characters
              </Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!reason || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!reason || submitting}
              >
                <Text style={styles.submitText}>
                  {submitting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.warning}>
              Reports are reviewed by our moderation team. False reports may
              result in action against your account.
            </Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeBtn: {
    fontSize: 24,
    color: "#64748b",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  targetName: {
    fontWeight: "600",
    color: "#1e293b",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "right",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
  warning: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
  },
});

export default ReportModal;
