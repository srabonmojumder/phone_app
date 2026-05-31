import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import GlobalBottomNav from '../../components/GlobalBottomNav';

export default function AppLayout() {
  return (
    <View style={styles.layout}>
      <Stack>
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="menu" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="files" options={{ headerShown: false }} />
        <Stack.Screen name="image" options={{ headerShown: false }} />
        <Stack.Screen name="video" options={{ headerShown: false }} />
        <Stack.Screen name="music" options={{ headerShown: false }} />
        <Stack.Screen name="doc" options={{ headerShown: false }} />
      </Stack>
      <GlobalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
});
