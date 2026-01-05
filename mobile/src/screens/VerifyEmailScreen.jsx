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
import authService from "../services/api";

const VerifyEmailScreen = ({ navigation, route }) => {
  const { isDark } = useTheme();
  const email = route.params?.email || "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyEmail(token.trim());
      Alert.alert(
        "Success",
        "Your email has been verified! You can now log in.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Invalid or expired verification code";
      Alert.alert("Verification Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert("Error", "Email address not found. Please register again.");
      return;
    }

    setResending(true);
    try {
      await authService.resendVerification(email);
      Alert.alert(
        "Success",
        "A new verification code has been sent to your email"
      );
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to resend verification code";
      Alert.alert("Error", message);
    } finally {
      setResending(false);
    }
  };

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a verification code to{"\n"}
        <Text style={styles.email}>{email || "your email"}</Text>
      </Text>

      <TextInput
        placeholder="Enter verification code"
        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
        value={token}
        onChangeText={setToken}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResend}
        disabled={resending || loading}
      >
        {resending ? (
          <ActivityIndicator color="#3b82f6" size="small" />
        ) : (
          <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      justifyContent: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: isDark ? "#f1f5f9" : "#1e293b",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: isDark ? "#cbd5e1" : "#475569",
      marginBottom: 32,
      lineHeight: 22,
    },
    email: {
      fontWeight: "600",
      color: isDark ? "#60a5fa" : "#3b82f6",
    },
    input: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#cbd5e1",
      paddingHorizontal: 16,
      backgroundColor: isDark ? "#1e293b" : "#fff",
      color: isDark ? "#f1f5f9" : "#1e293b",
      fontSize: 16,
      marginBottom: 16,
    },
    button: {
      backgroundColor: "#3b82f6",
      paddingVertical: 16,
      borderRadius: 10,
      alignItems: "center",
      marginBottom: 12,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
    resendButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    resendText: {
      color: "#3b82f6",
      fontSize: 15,
      fontWeight: "600",
    },
    backButton: {
      marginTop: 24,
      alignItems: "center",
    },
    backText: {
      color: isDark ? "#94a3b8" : "#64748b",
      fontSize: 15,
      fontWeight: "500",
    },
  });

export default VerifyEmailScreen;
