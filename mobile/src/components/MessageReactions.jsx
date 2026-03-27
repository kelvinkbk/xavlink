import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

// Extended reactions with categories
const REACTIONS = [
  "👍",
  "👏",
  "🙌",
  "💪", // Positive
  "❤️",
  "🧡",
  "💛",
  "💚", // Love
  "😂",
  "🤣",
  "😄",
  "😁", // Laughter
  "😮",
  "🤔",
  "🤨",
  "😕", // Surprise/Confusion
  "😢",
  "😭",
  "😔",
  "😞", // Sad
  "😡",
  "🤬",
  "😠",
  "🔥", // Angry/Fire
  "🎉",
  "🎊",
  "🥳",
  "✨", // Celebration
  "👀",
  "💯",
  "🙏",
  "👌", // Other
];

const MessageReactions = ({ visible, onSelectReaction, onClose, message }) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [selectedReactions, setSelectedReactions] = useState({});

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleReactionPress = (emoji) => {
    // Haptic feedback
    try {
      require("react-native").Vibration.vibrate(50);
    } catch (e) {
      // Fallback if haptics not available
    }
    onSelectReaction(emoji);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.reactionBox,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              ✨ React to message
            </Text>
            <ScrollView
              horizontal
              scrollEnabled={false}
              style={styles.reactionsContainer}
            >
              <View style={styles.reactionsGrid}>
                {REACTIONS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reactionButton,
                      {
                        backgroundColor:
                          colors.inputBackground || colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleReactionPress(emoji)}
                    activeOpacity={0.7}
                  >
                    <Animated.Text style={styles.emoji}>{emoji}</Animated.Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const ReactionBubble = ({ emoji, count, onPress, userReacted = false }) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          backgroundColor: userReacted
            ? colors.primary + "20"
            : colors.inputBackground || colors.background,
          borderColor: userReacted ? colors.primary : colors.border,
          borderWidth: userReacted ? 1.5 : 0,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bubbleContent}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.bubbleEmoji}>{emoji}</Text>
        {count > 0 && (
          <Text
            style={[
              styles.count,
              { color: userReacted ? colors.primary : colors.textSecondary },
            ]}
          >
            {count}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  reactionBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  reactionsContainer: {
    marginHorizontal: -12,
  },
  reactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  reactionButton: {
    width: Dimensions.get("window").width / 8 - 10,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
  },
  bubble: {
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  bubbleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export { MessageReactions, ReactionBubble };
