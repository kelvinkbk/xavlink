import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  text: {
    marginTop: 12,
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SplashScreen;
