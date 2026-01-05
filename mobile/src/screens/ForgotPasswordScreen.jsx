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

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
      Alert.alert(
        "Email Sent",
        "Password reset instructions have been sent to your email. Please check your inbox.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("ResetPassword", { email: email.trim() }),
          },
        ]
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ||
          "Failed to send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Forgot Password
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter your email address and we'll send you instructions to reset your
        password.
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
        ]}
        placeholderTextColor={colors.textMuted}
        editable={!loading && !sent}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSendReset}
        disabled={loading || sent}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {sent ? "Email Sent" : "Send Reset Link"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
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
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
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

export default ForgotPasswordScreen;
