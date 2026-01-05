import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    course: "",
    year: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Normalize year to integer or null to match backend validation
      const payload = {
        ...form,
        year:
          form.year === "" || form.year === undefined
            ? null
            : Number(form.year),
      };
      await register(payload);
      // Navigate to email verification screen
      navigation.navigate("VerifyEmail", { email: form.email });
    } catch (e) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        (status
          ? `Request failed (${status})`
          : "Please check your connection");
      console.warn("Register error", {
        status,
        data: e?.response?.data,
        error: String(e),
      });
      Alert.alert("Registration failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join XavLink</Text>
      <Text style={styles.subtitle}>Create your campus profile</Text>

      <TextInput
        placeholder="Name"
        value={form.name}
        onChangeText={(t) => handleChange("name", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(t) => handleChange("email", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(t) => handleChange("password", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Course"
        value={form.course}
        onChangeText={(t) => handleChange("course", t)}
        style={styles.input}
      />
      <TextInput
        placeholder="Year (number)"
        keyboardType="number-pad"
        value={form.year}
        onChangeText={(t) => handleChange("year", t)}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating..." : "Register"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#3b82f6",
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
});

export default RegisterScreen;
