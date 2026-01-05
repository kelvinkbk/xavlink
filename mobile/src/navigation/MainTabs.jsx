import React, { useEffect, useState, useRef } from "react";
import { Text, Animated, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import FloatingActionButton from "../components/FloatingActionButton";
import CreatePostModal from "../components/CreatePostModal";
import AddSkillModal from "../components/AddSkillModal";
import ChatListScreen from "../screens/ChatListScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FollowersScreen from "../screens/FollowersScreen";
import FollowingScreen from "../screens/FollowingScreen";
import SkillsScreen from "../screens/SkillsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import InboxScreen from "../screens/InboxScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import { useAuth } from "../context/AuthContext";
import { notificationService, requestService } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Chat Stack Navigator
const ChatStackNavigator = () => {
  const { colors } = useTheme();
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <ChatStack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <ChatStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Chat" }}
      />
    </ChatStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  const { colors } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={({ route }) => ({
          title: `${route.params?.userName || "User"}'s Followers`,
        })}
      />
      <ProfileStack.Screen
        name="Following"
        component={FollowingScreen}
        options={({ route }) => ({
          title: `${route.params?.userName || "User"} is Following`,
        })}
      />
    </ProfileStack.Navigator>
  );
};

// Animated Tab Icon Component
const AnimatedTabIcon = ({ icon, color, isFocused }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.2 : 1,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [isFocused]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Text style={{ fontSize: 20, color }}>{icon}</Text>
    </Animated.View>
  );
};

const MainTabs = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [badge, setBadge] = useState(0);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.id) return;
      try {
        const [{ data: notif }, { data: reqs }] = await Promise.all([
          notificationService.getUnreadCount(user.id),
          requestService.getReceived(user.id),
        ]);
        const pending = Array.isArray(reqs)
          ? reqs.filter((r) => r.status === "pending").length
          : 0;
        const total = (notif?.unreadCount || 0) + pending;
        if (active) setBadge(total);
      } catch (_) {}
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Show admin tab for admin/moderator
  const isAdminOrMod = user?.role === "admin" || user?.role === "moderator";
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.surface },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: "#fff" },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        {isAdminOrMod && (
          <Tab.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{
              tabBarLabel: "Admin",
              tabBarIcon: ({ color, focused }) => (
                <AnimatedTabIcon icon="🛡️" color={color} isFocused={focused} />
              ),
            }}
          />
        )}
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="🏠" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Skills"
          component={SkillsScreen}
          options={{
            tabBarLabel: "Skills",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="🧰" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarLabel: "Discover",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="🔍" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatTab"
          component={ChatStackNavigator}
          options={{
            tabBarLabel: "Chat",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="💬" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            tabBarLabel: "Inbox",
            tabBarBadge: badge > 0 ? badge : undefined,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="📥" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNavigator}
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="👤" color={color} isFocused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon icon="⚙️" color={color} isFocused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
      <FloatingActionButton
        bottomOffset={64}
        onCreatePost={() => setShowCreatePostModal(true)}
        onAddSkill={() => setShowAddSkillModal(true)}
      />

      <CreatePostModal
        visible={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onSuccess={() => {
          // Refresh home screen if needed
          console.log("Post created successfully");
        }}
      />

      <AddSkillModal
        visible={showAddSkillModal}
        onClose={() => setShowAddSkillModal(false)}
        onSuccess={() => {
          // Refresh skills screen if needed
          console.log("Skill added successfully");
        }}
      />
    </View>
  );
};

export default MainTabs;
