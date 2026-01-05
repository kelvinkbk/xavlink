import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";

const Stack = createNativeStackNavigator();

// Smooth native stack animations (no extra deps)
const screenOptions = {
  animation: "slide_from_right",
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ headerTitle: "Register" }}
    />
    <Stack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ headerTitle: "Forgot Password" }}
    />
    <Stack.Screen
      name="ResetPassword"
      component={ResetPasswordScreen}
      options={{ headerTitle: "Reset Password" }}
    />
    <Stack.Screen
      name="VerifyEmail"
      component={VerifyEmailScreen}
      options={{ headerTitle: "Verify Email" }}
    />
  </Stack.Navigator>
);

export default AuthStack;
