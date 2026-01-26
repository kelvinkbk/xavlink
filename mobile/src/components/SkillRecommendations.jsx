import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { enhancementService, skillService } from "../services/api";

const SkillRecommendations = ({ onSkillAdded }) => {
  const { colors } = useTheme();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const data = await enhancementService.getSkillRecommendations();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async (skill) => {
    setAdding(skill.id);
    try {
      await skillService.addSkill({
        title: skill.title,
        description: skill.description || "",
        proficiency: "beginner",
      });
      setRecommendations((prev) => prev.filter((s) => s.id !== skill.id));
      Alert.alert("Success", `${skill.title} added to your skills`);
      onSkillAdded?.();
    } catch (error) {
      Alert.alert("Error", "Failed to add skill");
    } finally {
      setAdding(null);
    }
  };

  const renderRecommendation = ({ item }) => (
    <View
      style={[
        styles.recommendationItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {item.title}
          </Text>
          {item.trending && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>🔥 Trending</Text>
            </View>
          )}
        </View>
        {item.reason && (
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            {item.reason}
          </Text>
        )}
        {item.matchScore && (
          <Text style={[styles.match, { color: colors.primary }]}>
            {item.matchScore}% match
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => addSkill(item)}
        disabled={adding === item.id}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.addButtonText}>
          {adding === item.id ? "..." : "+"}
        </Text>
      </TouchableOpacity>
    </View>
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          💡 Recommended Skills
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Based on your profile
        </Text>
      </View>

      {recommendations.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No recommendations available
        </Text>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  reason: {
    fontSize: 14,
    marginBottom: 4,
  },
  match: {
    fontSize: 12,
    fontWeight: "600",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});

export default SkillRecommendations;
