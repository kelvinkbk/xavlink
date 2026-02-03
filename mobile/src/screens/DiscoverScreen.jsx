import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { userService, chatService } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [startingChats, setStartingChats] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSuggested();
  }, []);

  const fetchSuggested = async () => {
    try {
      setSuggestedLoading(true);
      const response = await userService.getSuggestedUsers(15);
      console.log("Suggested users response:", response.data);

      // Handle nested suggestions structure: { suggestions: [{ category, users }] }
      let users = [];
      if (
        response.data?.suggestions &&
        Array.isArray(response.data.suggestions)
      ) {
        // Flatten all users from all categories
        users = response.data.suggestions.flatMap(
          (suggestion) => suggestion.users || [],
        );
      } else if (response.data?.users && Array.isArray(response.data.users)) {
        // Fallback for flat structure
        users = response.data.users;
      } else if (Array.isArray(response.data)) {
        // Fallback for direct array
        users = response.data;
      }

      console.log("Extracted users:", users.length);
      setSuggestedUsers(users);
    } catch (error) {
      console.error("Failed to fetch suggested users:", error);
      setSuggestedUsers([]);
    } finally {
      setSuggestedLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await userService.searchUsers(searchQuery);
      console.log("Search results:", response.data);
      // Handle different response formats
      const users = response.data?.users || response.data || [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId) => {
    if (startingChats.has(userId)) return;

    setStartingChats(new Set(startingChats).add(userId));
    try {
      const response = await chatService.getOrCreateDirectChat(userId);
      const chat = response?.data || response;
      if (!chat?.id) {
        throw new Error("Invalid chat response");
      }
      navigation.navigate("ChatTab", {
        screen: "Chat",
        params: { chatId: chat.id },
      });
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to start chat",
      );
    } finally {
      setStartingChats((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuggested();
    setRefreshing(false);
  };

  const UserCard = ({ user }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: colors.surface }]}
      onPress={() =>
        navigation.navigate("Profile", {
          screen: "ProfileMain",
          params: { userId: user.id },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.userCardContent}>
        <Image
          source={{
            uri: user.profilePic || "https://placehold.co/64x64?text=User",
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
          {user.course && (
            <Text style={[styles.userCourse, { color: colors.textSecondary }]}>
              {user.course}
            </Text>
          )}
          {user.bio && (
            <Text
              style={[styles.userBio, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {user.bio}
            </Text>
          )}
        </View>
        <View style={styles.userStats}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {String(user.followersCount || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Followers
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.messageBtn, { backgroundColor: colors.primary }]}
        onPress={(e) => {
          e.stopPropagation();
          startChat(user.id);
        }}
        disabled={startingChats.has(user.id)}
      >
        {startingChats.has(user.id) ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.messageBtnText}>💬</Text>
            <Text style={styles.messageBtnText}>Message</Text>
          </View>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>
        Discover People
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, email, or course..."
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[
            styles.searchBtn,
            {
              backgroundColor:
                searchQuery.trim().length < 2
                  ? colors.disabled
                  : colors.primary,
            },
          ]}
          onPress={handleSearch}
          disabled={loading || searchQuery.trim().length < 2}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchBtnText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Enter at least 2 characters to search
      </Text>

      <FlatList
        data={searchResults.length > 0 ? searchResults : suggestedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserCard user={item} />}
        ListHeaderComponent={
          <>
            {searchResults.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Search Results ({searchResults.length})
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                >
                  <Text style={{ color: colors.primary }}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
            {searchResults.length === 0 && (
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Suggested for You
                </Text>
                <TouchableOpacity onPress={fetchSuggested}>
                  <Text style={{ color: colors.primary }}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading || suggestedLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                {loading ? "Searching..." : "Loading suggestions..."}
              </Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchResults.length === 0 && searchQuery
                  ? "No users found"
                  : "No suggestions available"}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  searchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userCardContent: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userCourse: {
    fontSize: 12,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 13,
    marginTop: 4,
  },
  userStats: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  messageBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default DiscoverScreen;
