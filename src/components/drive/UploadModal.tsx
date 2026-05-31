import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../constants/theme';
import { Ic } from '../../constants/icons';

type UploadItem = {
  id: string;
  name: string;
  type: 'files' | 'image' | 'video' | 'music' | 'doc';
  size: string;
  date: string;
  uri?: string;
  mimeType?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onUpload: (item: UploadItem) => void | Promise<void>;
  onUploadMultiple?: (items: UploadItem[]) => void | Promise<void>;
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '1.0 MB';
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(1)} GB`;
  return `${Math.max(megabytes, 0.1).toFixed(1)} MB`;
};

const getCategory = (mimeType?: string, name?: string): UploadItem['type'] => {
  const value = `${mimeType || ''} ${name || ''}`.toLowerCase();
  if (value.includes('image/')) return 'image';
  if (value.includes('video/')) return 'video';
  if (value.includes('audio/')) return 'music';
  if (value.includes('pdf') || value.includes('doc') || value.includes('txt') || value.includes('sheet') || value.includes('xls')) return 'doc';
  return 'files';
};

export function UploadModal({ visible, onClose, onUpload, onUploadMultiple }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [loading, setLoading] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const pickDocument = async (multiple: boolean = false) => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple,
        copyToCacheDirectory: true,
        type: multiple ? ['image/*', 'video/*', 'application/pdf', 'text/*'] : undefined,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      if (multiple && onUploadMultiple) {
        const items = result.assets.map((asset) => ({
          id: `local_${Date.now()}_${Math.random()}`,
          name: asset.name || 'Untitled file',
          type: getCategory(asset.mimeType, asset.name),
          size: formatBytes(asset.size),
          date: new Date().toISOString().split('T')[0],
          uri: asset.uri,
          mimeType: asset.mimeType,
        }));
        onUploadMultiple(items);
      } else {
        const asset = result.assets[0];
        onUpload({
          id: `local_${Date.now()}`,
          name: asset.name || 'Untitled file',
          type: getCategory(asset.mimeType, asset.name),
          size: formatBytes(asset.size),
          date: new Date().toISOString().split('T')[0],
          uri: asset.uri,
          mimeType: asset.mimeType,
        });
      }
      onClose();
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Could not open the file picker.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ic.Upload size={22} color="#10B981" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: colors.text }]}>Upload files</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Pick a file from your device and add it to the drive.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => pickDocument(true)} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Choose Multiple Files</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.backgroundSelected }]} onPress={() => pickDocument(false)} disabled={loading}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Choose Single File</Text>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)' }]} onPress={() => pickDocument(true)}>
              <Ic.Image size={18} color={colors.text} />
              <Text style={[styles.quickButtonText, { color: colors.text }]}>Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)' }]} onPress={() => pickDocument(true)}>
              <Ic.Video size={18} color={colors.text} />
              <Text style={[styles.quickButtonText, { color: colors.text }]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)' }]} onPress={() => pickDocument(false)}>
              <Ic.Doc size={18} color={colors.text} />
              <Text style={[styles.quickButtonText, { color: colors.text }]}>Doc</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 18,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.5)',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});