import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { authService } from "../services/api";

const ResetPasswordScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const emailParam = route?.params?.email || "";

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!token.trim()) {
      Alert.alert("Error", "Please enter the reset token from your email");
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), newPassword);
      Alert.alert(
        "Success",
        "Your password has been reset successfully. Please login with your new password.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ||
          "Failed to reset password. Please check your token and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Reset Password
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter the reset token from your email and choose a new password.
      </Text>

      {emailParam ? (
        <Text style={[styles.emailHint, { color: colors.textMuted }]}>
          Token sent to: {emailParam}
        </Text>
      ) : null}

      <TextInput
        placeholder="Reset Token"
        autoCapitalize="none"
        value={token}
        onChangeText={setToken}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
        ]}
        placeholderTextColor={colors.textMuted}
        editable={!loading}
      />

      <TextInput
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
        ]}
        placeholderTextColor={colors.textMuted}
        editable={!loading}
      />

      <TextInput
        placeholder="Confirm New Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
        ]}
        placeholderTextColor={colors.textMuted}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={[styles.link, { color: colors.primary }]}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  emailHint: {
    fontSize: 13,
    marginBottom: 16,
    fontStyle: "italic",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default ResetPasswordScreen;
