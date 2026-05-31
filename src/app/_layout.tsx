import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/auth';
import { DriveProvider } from '../contexts/drive';
import { useEffect } from 'react';
import { Colors } from '../constants/theme';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(app)/dashboard');
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: Colors[colorScheme === 'dark' ? 'dark' : 'light'].background,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <DriveProvider>
          <ProtectedLayout />
        </DriveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
