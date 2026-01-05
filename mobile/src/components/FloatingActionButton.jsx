import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FloatingActionButton = ({
  onCreatePost,
  onAddSkill,
  bottomOffset = 0,
  rightOffset = -32,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const rotation = useRef(new Animated.Value(0)).current;
  const scaleOption1 = useRef(new Animated.Value(0)).current;
  const scaleOption2 = useRef(new Animated.Value(0)).current;
  const opacityOption1 = useRef(new Animated.Value(0)).current;
  const opacityOption2 = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      // Rotate main button
      Animated.timing(rotation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      // Animate first option (Create Post)
      Animated.sequence([
        Animated.delay(isExpanded ? 0 : 50),
        Animated.parallel([
          Animated.spring(scaleOption1, {
            toValue,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityOption1, {
            toValue,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Animate second option (Add Skill)
      Animated.sequence([
        Animated.delay(isExpanded ? 0 : 100),
        Animated.parallel([
          Animated.spring(scaleOption2, {
            toValue,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityOption2, {
            toValue,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const handleCreatePost = () => {
    console.log("Create Post button tapped");
    toggleMenu();
    if (onCreatePost) {
      onCreatePost();
    }
  };

  const handleAddSkill = () => {
    console.log("Add Skill button tapped");
    toggleMenu();
    if (onAddSkill) {
      onAddSkill();
    }
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dynamicStyles = {
    container: [
      styles.container,
      {
        bottom: Math.max(12, (bottomOffset || 0) + insets.bottom + 16),
        right: rightOffset,
      },
    ],
  };

  return (
    <View style={dynamicStyles.container} pointerEvents="box-none">
      {/* Create Post Option */}
      <Animated.View
        style={[
          styles.optionContainer,
          {
            transform: [{ scale: scaleOption1 }],
            opacity: opacityOption1,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.optionLabel,
            { color: colors.text, backgroundColor: colors.primary },
          ]}
          onPress={handleCreatePost}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            Create Post
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Add Skill Option */}
      <Animated.View
        style={[
          styles.optionContainer,
          {
            transform: [{ scale: scaleOption2 }],
            opacity: opacityOption2,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.optionLabel,
            { color: colors.text, backgroundColor: colors.primary },
          ]}
          onPress={handleAddSkill}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            Add Skill
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main FAB Button */}
      <Animated.View
        style={{
          transform: [{ rotate: rotateInterpolate }],
        }}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={toggleMenu}
          activeOpacity={0.9}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80,
    right: 16,
    alignItems: "center",
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
  },
  optionContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 15,
  },
  optionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    marginRight: 40,
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default FloatingActionButton;
