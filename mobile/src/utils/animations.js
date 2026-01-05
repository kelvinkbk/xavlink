import React, { useEffect } from "react";
import { Animated } from "react-native";

export const useFadeInAnimation = (duration = 500) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration]);

  return fadeAnim;
};

export const useSlideInAnimation = (duration = 500, fromValue = 50) => {
  const slideAnim = React.useRef(new Animated.Value(fromValue)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, duration]);

  return slideAnim;
};

export const useScalePressAnimation = () => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 15,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 15,
    }).start();
  };

  return { scaleAnim, onPressIn, onPressOut };
};
