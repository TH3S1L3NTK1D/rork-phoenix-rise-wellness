import React from 'react';
import { Redirect } from 'expo-router';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
