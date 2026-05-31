import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ic } from '../../constants/icons';
import { account, getTelegramConfig, saveTelegramConfig } from '../../lib/supabase';
import { useAuth } from '../../contexts/auth';

const defaultNotifications = {
  push: true,
  email: true,
  shared: true,
};

let mediaLibraryModule: typeof import('expo-media-library/legacy') | null = null;

const getMediaLibrary = async () => {
  if (mediaLibraryModule) return mediaLibraryModule;

  try {
    mediaLibraryModule = await import('expo-media-library/legacy');
    return mediaLibraryModule;
  } catch (error) {
    console.warn('MediaLibrary native module is unavailable:', error);
    return null;
  }
};

export function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [fullName, setFullName] = useState('');
  const [telegramBotName, setTelegramBotName] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [autoUploadLibrary, setAutoUploadLibrary] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<string[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);

  useEffect(() => {
    const metadata = user?.user_metadata || {};
    setFullName(metadata.name || '');
    setNotifications({
      push: metadata.notifications?.push ?? true,
      email: metadata.notifications?.email ?? true,
      shared: metadata.notifications?.shared ?? true,
    });
    setAutoUploadLibrary(metadata.autoUploadLibrary ?? false);
    setSelectedAlbums(Array.isArray(metadata.autoUploadAlbums) ? metadata.autoUploadAlbums : []);

    const loadTelegramConfig = async () => {
      if (!user?.id) return;
      try {
        const config = await getTelegramConfig(user.id);
        if (config) {
          setTelegramBotName(config.name || '');
          setTelegramBotToken(config.token || '');
          setTelegramChatId(config.chat_id || '');
        } else {
          setTelegramBotName(metadata.telegramBotName || '');
          setTelegramBotToken(metadata.telegramBotToken || '');
          setTelegramChatId(metadata.telegramChatId || '');
        }
      } catch (err) {
        console.warn('Unable to load Telegram config for settings:', err);
      }
    };

    loadTelegramConfig();
  }, [user]);

  useEffect(() => {
    const loadAlbums = async () => {
      if (Platform.OS === 'web' || !autoUploadLibrary) {
        setAvailableAlbums([]);
        return;
      }

      setLoadingAlbums(true);
      try {
        const mediaLibrary = await getMediaLibrary();
        if (!mediaLibrary) {
          setAvailableAlbums([]);
          return;
        }

        const permission = await mediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
        if (!permission.granted) {
          setAvailableAlbums([]);
          return;
        }

        const albums = await mediaLibrary.getAlbumsAsync();
        const names = Array.from(new Set((albums || []).map((album) => album.title).filter(Boolean)));
        setAvailableAlbums(names);
      } catch (error) {
        console.warn('Unable to load device albums:', error);
        setAvailableAlbums([]);
      } finally {
        setLoadingAlbums(false);
      }
    };

    loadAlbums();
  }, [autoUploadLibrary]);

  const displayName = useMemo(() => fullName?.trim() || user?.email?.split('@')[0] || 'there', [fullName, user]);

  const saveProfile = async (override?: { autoUploadLibrary?: boolean; autoUploadAlbums?: string[] }) => {
    setSavingProfile(true);
    try {
      const updated = await account.updateProfile({
        name: fullName.trim(),
        notifications,
        autoUploadLibrary: override?.autoUploadLibrary ?? autoUploadLibrary,
        autoUploadAlbums: override?.autoUploadAlbums ?? selectedAlbums,
      });

      if (user?.id && telegramBotName.trim() && telegramBotToken.trim() && telegramChatId.trim()) {
        await saveTelegramConfig(user.id, {
          name: telegramBotName.trim(),
          token: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
        });
      }

      Alert.alert('Saved', 'Profile and Telegram sync settings updated.');
      return updated;
    } catch (error: any) {
      Alert.alert('Save failed', error.message || 'Could not update profile settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Missing password', 'Enter a new password first.');
      return;
    }
    setSavingPassword(true);
    try {
      await account.updatePassword(newPassword.trim());
      setOldPassword('');
      setNewPassword('');
      Alert.alert('Password updated', 'Use the new password on your next login.');
    } catch (error: any) {
      Alert.alert('Password update failed', error.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Logout failed', error.message || 'Could not sign out.');
    }
  };

  const toggleAutoUpload = async (nextValue: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Gallery auto-upload is only available on mobile devices.');
      return;
    }

    if (!nextValue) {
      setAutoUploadLibrary(false);
      await saveProfile({ autoUploadLibrary: false });
      return;
    }

    try {
      const mediaLibrary = await getMediaLibrary();
      if (!mediaLibrary) {
        Alert.alert('Unavailable', 'Gallery permissions are not available in this runtime. Rebuild the app after installing expo-media-library.');
        setAutoUploadLibrary(false);
        return;
      }

      const permission = await mediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo and video access to enable auto-upload.');
        setAutoUploadLibrary(false);
        return;
      }

      setAutoUploadLibrary(true);
      await saveProfile({ autoUploadLibrary: true });
    } catch (error: any) {
      Alert.alert('Permission failed', error?.message || 'Unable to request gallery permission.');
      setAutoUploadLibrary(false);
    }
  };

  const setAlbumSelection = async (albumTitle: string, enabled: boolean) => {
    const activeAlbums = selectedAlbums.length === 0 ? availableAlbums : selectedAlbums;
    const nextSelection = enabled
      ? Array.from(new Set([...activeAlbums, albumTitle]))
      : activeAlbums.filter((title) => title !== albumTitle);
    const nextAlbums = nextSelection.length === availableAlbums.length ? [] : nextSelection;

    setSelectedAlbums(nextAlbums);
    await saveProfile({ autoUploadAlbums: nextAlbums });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(app)/menu')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}> 
                <Ic.Menu size={20} color={colors.text} />
              </TouchableOpacity>
            <View style={styles.iconButton} />
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.emailText, { color: colors.textSecondary }]}>{user?.email}</Text>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}><Ic.Users size={18} color={colors.text} /> Profile</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.readOnly, { borderColor: colors.backgroundSelected }]}>
              <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>{user?.email || 'No email available'}</Text>
            </View>
            <TouchableOpacity onPress={() => saveProfile()} disabled={savingProfile} style={[styles.primaryButton, { opacity: savingProfile ? 0.72 : 1 }]}>
              <Text style={styles.primaryButtonText}>{savingProfile ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}><Ic.Share size={18} color={colors.text} /> Telegram Sync</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bot Name</Text>
            <TextInput value={telegramBotName} onChangeText={setTelegramBotName} placeholder="t_drive_bot" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bot Token</Text>
            <TextInput value={telegramBotToken} onChangeText={setTelegramBotToken} placeholder="123456:ABC..." placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Chat ID</Text>
            <TextInput value={telegramChatId} onChangeText={setTelegramChatId} placeholder="123456789" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <TouchableOpacity onPress={() => saveProfile()} disabled={savingProfile} style={[styles.secondaryButton, { borderColor: colors.backgroundSelected }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{savingProfile ? 'Syncing...' : 'Save Sync Settings'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}><Ic.Bell size={18} color={colors.text} /> Notifications</Text>
            {[
              { key: 'push', label: 'Push Notifications', desc: 'Real-time alerts for shared files' },
              { key: 'email', label: 'Email Notifications', desc: 'Important account emails' },
              { key: 'shared', label: 'Shared File Alerts', desc: 'Changes to shared folders and links' },
            ].map((item) => (
              <View key={item.key} style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={notifications[item.key as keyof typeof notifications]}
                  onValueChange={(value) => setNotifications((current) => ({ ...current, [item.key]: value }))}
                />
              </View>
            ))}
            <TouchableOpacity onPress={() => saveProfile()} disabled={savingProfile} style={[styles.secondaryButton, { borderColor: colors.backgroundSelected }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{savingProfile ? 'Saving...' : 'Save Preferences'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}><Ic.Image size={18} color={colors.text} /> Auto Upload</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Sync gallery on open/resume</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>Uploads new photos and videos when the app opens or returns to the foreground.</Text>
              </View>
              <Switch value={autoUploadLibrary} onValueChange={toggleAutoUpload} />
            </View>

            {autoUploadLibrary ? (
              <View style={styles.albumSection}>
                <Text style={[styles.albumTitle, { color: colors.text }]}>Selected albums</Text>
                <Text style={[styles.albumHint, { color: colors.textSecondary }]}>Leave everything selected to sync the full gallery.</Text>
                {loadingAlbums ? (
                  <Text style={[styles.albumHint, { color: colors.textSecondary }]}>Loading albums...</Text>
                ) : availableAlbums.length > 0 ? (
                  availableAlbums.map((albumTitle) => (
                    <TouchableOpacity key={albumTitle} style={[styles.albumRow, { borderColor: colors.backgroundSelected }]} onPress={() => setAlbumSelection(albumTitle, !(selectedAlbums.length === 0 || selectedAlbums.includes(albumTitle)))}>
                      <View style={styles.toggleTextWrap}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>{albumTitle}</Text>
                        <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{selectedAlbums.length === 0 || selectedAlbums.includes(albumTitle) ? 'Included in auto-upload' : 'Excluded from auto-upload'}</Text>
                      </View>
                      <Switch value={selectedAlbums.length === 0 || selectedAlbums.includes(albumTitle)} onValueChange={(value) => setAlbumSelection(albumTitle, value)} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.albumHint, { color: colors.textSecondary }]}>No albums found, gallery sync will use all accessible media.</Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity onPress={() => saveProfile()} disabled={savingProfile} style={[styles.secondaryButton, { borderColor: colors.backgroundSelected }]}> 
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{savingProfile ? 'Saving...' : 'Save Auto-Upload Settings'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}><Ic.Lock size={18} color={colors.text} /> Password</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Enter a new password" placeholderTextColor={colors.textSecondary} secureTextEntry style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Current Password</Text>
            <TextInput value={oldPassword} onChangeText={setOldPassword} placeholder="Current password" placeholderTextColor={colors.textSecondary} secureTextEntry style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            <TouchableOpacity onPress={savePassword} disabled={savingPassword} style={[styles.primaryButton, { opacity: savingPassword ? 0.72 : 1 }]}>
              <Text style={styles.primaryButtonText}>{savingPassword ? 'Updating...' : 'Update Password'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { borderColor: '#EF4444' }]}>
            <Ic.Shield size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 120, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '900' },
  profileCard: { borderWidth: 1, borderRadius: 28, padding: 20, alignItems: 'center', gap: 6 },
  avatarWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  displayName: { fontSize: 22, fontWeight: '900' },
  emailText: { fontSize: 13 },
  sectionCard: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4, flexDirection: 'row' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, height: 52, fontSize: 15 },
  readOnly: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  readOnlyText: { fontSize: 15 },
  primaryButton: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { fontSize: 15, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 6 },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 15, fontWeight: '800' },
  toggleDesc: { fontSize: 12, lineHeight: 18 },
  albumSection: { gap: 10, marginTop: 8 },
  albumTitle: { fontSize: 15, fontWeight: '900' },
  albumHint: { fontSize: 12, lineHeight: 18 },
  albumRow: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  logoutButton: { borderWidth: 1, borderRadius: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  logoutText: { color: '#EF4444', fontWeight: '900' },
});
