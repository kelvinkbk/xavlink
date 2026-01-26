import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const ActivityTimeline = ({ activities = [] }) => {
  const { colors } = useTheme();

  const getActivityIcon = (type) => {
    const icons = {
      post_created: "📝",
      post_liked: "❤️",
      post_commented: "💬",
      user_followed: "👥",
      skill_endorsed: "⭐",
      request_sent: "✉️",
      request_completed: "✅",
      skill_added: "🎯",
    };
    return icons[type] || "📌";
  };

  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case "post_created":
        return "You created a post";
      case "post_liked":
        return "Your post was liked";
      case "post_commented":
        return "Someone commented on your post";
      case "user_followed":
        return `${activity.targetUser?.name || "Someone"} followed you`;
      case "skill_endorsed":
        return `${activity.targetUser?.name || "Someone"} endorsed your skill`;
      case "request_sent":
        return "You sent a collaboration request";
      case "request_completed":
        return "You completed a collaboration request";
      case "skill_added":
        return "You added a new skill";
      default:
        return activity.description || "Activity";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderActivity = ({ item, index }) => (
    <View
      style={[
        styles.activityItem,
        {
          borderLeftColor: colors.primary,
          borderBottomColor: colors.border,
        },
        index === activities.length - 1 && { borderBottomWidth: 0 },
      ]}
    >
      <Text style={styles.icon}>{getActivityIcon(item.type)}</Text>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.textPrimary }]}>
          {getActivityDescription(item)}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          📊 Recent Activity
        </Text>
      </View>
      {activities.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No recent activity
        </Text>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivity}
          keyExtractor={(item, index) => `${item.id || index}`}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    padding: 24,
    fontSize: 14,
  },
});

export default ActivityTimeline;
