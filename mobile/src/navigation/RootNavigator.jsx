import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "../screens/SplashScreen";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";

const Stack = createNativeStackNavigator();

// Native stack smooth animations without extra deps
const screenOptions = {
  headerShown: false,
  animation: "slide_from_right",
};

const RootNavigator = () => {
  const { loading, isAuthenticated } = useAuth();
  const isLoading = Boolean(loading);
  const isAuthed = Boolean(isAuthenticated);

  return (
    <NavigationContainer>
      {isLoading ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      ) : isAuthed ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Auth" component={AuthStack} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
