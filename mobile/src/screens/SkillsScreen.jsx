import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import { skillService } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  useFadeInAnimation,
  useScalePressAnimation,
} from "../utils/animations";

const SkillsScreen = () => {
  const { colors } = useTheme();
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
  });
  const fadeAnim = useFadeInAnimation(400);
  const {
    scaleAnim: addScale,
    onPressIn: onAddPressIn,
    onPressOut: onAddPressOut,
  } = useScalePressAnimation();

  const load = async () => {
    setRefreshing(true);
    try {
      const { data } = await skillService.searchSkills(search);
      setSkills(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load skills");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.category.trim()
    ) {
      Alert.alert("Missing", "Fill title, description and category");
      return;
    }
    try {
      setAdding(true);
      await skillService.addSkill({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
      });
      setForm({ title: "", description: "", category: "" });
      load();
      Alert.alert("Added", "Skill posted");
    } catch (e) {
      Alert.alert("Error", "Failed to add skill");
    } finally {
      setAdding(false);
    }
  };

  const handleRequest = async (skill) => {
    try {
      await skillService.requestSkill(skill.id, skill.userId);
      Alert.alert("Success", "Skill requested successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to request skill");
    }
  };

  const renderSkill = ({ item }) => (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        { opacity: fadeAnim },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {item.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {item.category}
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
      {item.user?.name && (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          by {item.user.name}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.requestBtn, { backgroundColor: colors.primary }]}
        onPress={() => handleRequest(item)}
      >
        <Text style={styles.requestText}>Request</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search skills"
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={load}
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          onPress={load}
        >
          <Text style={[styles.searchText, { color: "#fff" }]}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.listHeader, { color: colors.textPrimary }]}>
        Latest Skills
      </Text>
      <FlatList
        data={skills}
        keyExtractor={(item, index) => `skill-${item?.id ?? index}-${index}`}
        renderItem={renderSkill}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No skills found.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  searchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 10,
  },
  searchText: { color: "#fff", fontWeight: "700" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  textarea: { textAlignVertical: "top", minHeight: 80 },
  addBtn: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addText: { color: "#fff", fontWeight: "700" },
  listHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  listContent: { paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  meta: { fontSize: 12, color: "#475569", marginTop: 4 },
  desc: { fontSize: 14, color: "#1f2937", marginTop: 6 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
  requestBtn: {
    marginTop: 12,
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  requestText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default SkillsScreen;
