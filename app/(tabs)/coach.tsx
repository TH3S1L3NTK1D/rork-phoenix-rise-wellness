import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const EMERGENCY_DISABLE_AUDIO = true as const;

export default function CoachScreen() {
  if (EMERGENCY_DISABLE_AUDIO) {
    return (
      <SafeAreaView style={styles.container} testID="coach-audio-disabled">
        <View style={styles.card}>
          <Text style={styles.title}>Coach temporarily disabled</Text>
          <Text style={styles.subtitle}>Audio features are turned off in emergency mode. You can still use the rest of the app.</Text>
          <TouchableOpacity disabled style={styles.button}>
            <Text style={styles.buttonText}>Voice coming back soon</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container} testID="coach-enabled">
      <View style={styles.card}>
        <Text style={styles.title}>Coach</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f14' },
  card: { width: '86%', maxWidth: 520, backgroundColor: '#121826', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { color: '#9fb3c8', fontSize: 14, textAlign: 'center' as const, marginBottom: 16 },
  button: { backgroundColor: 'rgba(255,69,0,0.25)', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FF4500', fontSize: 14, fontWeight: '700' as const },
});
