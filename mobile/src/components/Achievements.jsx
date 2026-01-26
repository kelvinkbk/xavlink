import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { enhancementService } from "../services/api";

const Achievements = ({ userId }) => {
  const { colors } = useTheme();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const data = await enhancementService.getAchievements(userId);
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (type) => {
    const icons = {
      first_post: "🎉",
      first_skill: "🎯",
      first_follower: "👥",
      skill_master: "🏆",
      collaborator: "🤝",
      helper: "⭐",
      verified: "✅",
      popular: "🌟",
    };
    return icons[type] || "🏅";
  };

  const renderAchievement = ({ item }) => (
    <View
      style={[
        styles.achievementItem,
        {
          backgroundColor: item.unlocked ? colors.surface : colors.background,
          borderColor: item.unlocked ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={styles.icon}>{getAchievementIcon(item.type)}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
        {item.unlocked && item.unlockedAt && (
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      {!item.unlocked && (
        <View style={styles.lockContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
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
          🏆 Achievements
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
        </Text>
      </View>

      {achievements.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No achievements yet
        </Text>
      ) : (
        <FlatList
          data={achievements}
          renderItem={renderAchievement}
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
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    fontStyle: "italic",
  },
  lockContainer: {
    marginLeft: 8,
  },
  lockIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});

export default Achievements;
