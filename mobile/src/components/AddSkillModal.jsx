import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { skillService } from "../services/api";

const SKILL_CATEGORIES = [
  "Programming",
  "Design",
  "Marketing",
  "Business",
  "Content Writing",
  "Data Science",
  "DevOps",
  "Mobile Development",
  "Web Development",
  "Other",
];

const AddSkillModal = ({ visible, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Programming");
  const [description, setDescription] = useState("");
  const [proficiency, setProficiency] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showProficiencyDropdown, setShowProficiencyDropdown] = useState(false);

  const handleAddSkill = async () => {
    if (!title.trim()) {
      setError("Skill name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await skillService.addSkill({
        title: title.trim(),
        category,
        description: description.trim(),
        proficiency,
      });
      setTitle("");
      setDescription("");
      setCategory("Programming");
      setProficiency("intermediate");
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to add skill");
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
          <Text style={[styles.title, { color: colors.text }]}>Add Skill</Text>
          <TouchableOpacity
            onPress={handleAddSkill}
            disabled={loading || !title.trim()}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 16,
                fontWeight: "600",
                opacity: loading || !title.trim() ? 0.5 : 1,
              }}
            >
              Add
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
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="Skill Name (e.g., React, UI Design)"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.dropdownButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>{category}</Text>
          </TouchableOpacity>

          <Modal
            visible={showCategoryDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCategoryDropdown(false)}
          >
            <View style={styles.dropdownOverlay}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setShowCategoryDropdown(false)}
              />
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <ScrollView>
                  {SKILL_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.dropdownItem,
                        category === cat && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: category === cat ? "white" : colors.text,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <TextInput
            style={[
              styles.descriptionInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.dropdownButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() => setShowProficiencyDropdown(true)}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {proficiency.charAt(0).toUpperCase() + proficiency.slice(1)}
            </Text>
          </TouchableOpacity>

          <Modal
            visible={showProficiencyDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowProficiencyDropdown(false)}
          >
            <View style={styles.dropdownOverlay}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setShowProficiencyDropdown(false)}
              />
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {["beginner", "intermediate", "advanced", "expert"].map(
                  (level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.dropdownItem,
                        proficiency === level && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        setProficiency(level);
                        setShowProficiencyDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color:
                              proficiency === level ? "white" : colors.text,
                          },
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </Modal>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    justifyContent: "center",
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    maxHeight: 250,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  dropdownItemText: {
    fontSize: 16,
  },
});

export default AddSkillModal;
