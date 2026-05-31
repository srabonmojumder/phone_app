import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ic } from '../../constants/icons';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

type MenuIcon = React.ComponentType<{ size?: number; color?: string }>;
const icons = Ic as any;

const cats = [
  { id: 'dashboard', label: 'Dashboard', Icon: icons.Home, path: '/(app)/dashboard' },
  { id: 'files', label: 'My Files', Icon: icons.Folder, path: '/(app)/files' },
  { id: 'image', label: 'Images', Icon: icons.Image, path: '/(app)/image' },
  { id: 'video', label: 'Videos', Icon: icons.Video, path: '/(app)/video' },
  { id: 'music', label: 'Music', Icon: icons.Music, path: '/(app)/music' },
  { id: 'doc', label: 'Documents', Icon: icons.Doc, path: '/(app)/doc' },
  { id: 'analytics', label: 'Analytics', Icon: icons.BarChart, path: '/(app)/analytics' },
  { id: 'settings', label: 'Settings', Icon: icons.Settings, path: '/(app)/settings' },
];

export default function MenuScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const activeRoute = cats.find((item) => item.path === pathname)?.id ?? 'dashboard';

  const handleNavigation = (id: string) => {
    switch (id) {
      case 'files':
        router.push('/(app)/files');
        return;
      case 'image':
        router.push('/(app)/image');
        return;
      case 'video':
        router.push('/(app)/video');
        return;
      case 'music':
        router.push('/(app)/music');
        return;
      case 'doc':
        router.push('/(app)/doc');
        return;
      case 'analytics':
        router.push('/(app)/analytics');
        return;
      case 'settings':
        router.push('/(app)/settings');
        return;
      case 'dashboard':
      default:
        router.push('/(app)/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={isDark ? 80 : 100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)' }]}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={[styles.brandText, { color: colors.text }]}>T-Drive</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <icons.X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuItems}>
          {cats.map((c) => {
            const isActive = activeRoute === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => handleNavigation(c.id)} style={[styles.menuItem, isActive && { backgroundColor: '#10B981' }]}>
                <c.Icon color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.menuLabel, { color: isActive ? '#FFFFFF' : colors.textSecondary }, isActive && { fontWeight: 'bold' }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.proBanner}>
          <Text style={styles.proTitle}>Upgrade to Pro</Text>
          <Text style={styles.proDesc}>Get 1TB storage & premium</Text>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    width: width * 0.85,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    flex: 1,
  },
  closeBtn: {
    padding: 8,
  },
  menuItems: {
    flex: 1,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  proBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 20,
    borderRadius: 24,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  proTitle: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  proDesc: {
    color: '#059669',
    fontSize: 12,
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
