import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, useColorScheme, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Ic } from '../constants/icons';

export default function GlobalBottomNav() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const openUpload = () => {
    router.push(`/(app)/dashboard?upload=${Date.now()}`);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={[styles.nav, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}> 
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(app)/dashboard')}>
          <Ic.Home size={20} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(app)/image')}>
          <Ic.Image size={20} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadWrapper} onPress={openUpload}>
          <View style={styles.uploadButton}>
            <Ic.Upload size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(app)/files')}>
          <Ic.FileText size={20} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Files</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(app)/settings')}>
          <Ic.Settings size={20} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 50,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
  },
  nav: {
    width: '92%',
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  uploadWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#10B981',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
});
