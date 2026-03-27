import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

const ProfileStats = ({
  followers = 0,
  following = 0,
  posts = 0,
  skills = 0,
  compact = false,
}) => {
  const { colors } = useTheme();

  const stats = [
    { label: "Posts", value: posts },
    { label: "Followers", value: followers },
    { label: "Following", value: following },
    { label: "Skills", value: skills },
  ];

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {stats.map((stat, index) => (
        <View
          key={index}
          style={[
            styles.stat,
            {
              borderRightColor: colors.border,
              borderRightWidth: index < stats.length - 1 ? 1 : 0,
            },
          ]}
        >
          <Text style={[styles.value, { color: colors.primary }]}>
            {stat.value}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  compact: {
    paddingVertical: 12,
  },
  stat: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default ProfileStats;
