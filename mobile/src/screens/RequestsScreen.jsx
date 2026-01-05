import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { requestService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const RequestsScreen = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const { data } = await requestService.getReceived(user.id);
      setRequests(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const updateStatus = async (id, status) => {
    try {
      await requestService.updateStatus(id, status);
      load();
    } catch (e) {
      Alert.alert("Error", "Failed to update request");
    }
  };

  const renderRequest = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>
        {item.fromUser?.name || "Unknown requester"}
      </Text>
      {item.skill?.title && (
        <Text style={styles.meta}>Skill: {item.skill.title}</Text>
      )}
      <Text style={styles.meta}>Status: {item.status}</Text>
      <Text style={styles.meta}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.accept]}
            onPress={() => updateStatus(item.id, "accepted")}
          >
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.reject]}
            onPress={() => updateStatus(item.id, "rejected")}
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item, index) =>
          `request-${item?.id ?? index}-${item?.createdAt ?? index}`
        }
        renderItem={renderRequest}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No requests yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  meta: { fontSize: 12, color: "#475569", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  accept: { backgroundColor: "#10b981" },
  reject: { backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
});

export default RequestsScreen;
