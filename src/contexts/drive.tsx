import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';
import { File, UploadType } from 'expo-file-system';
import { deleteTelegramFileMeta, getTelegramConfig, getTelegramFileMetaList, saveTelegramFileMeta } from '../lib/supabase';

export type DriveFileType = 'files' | 'image' | 'video' | 'music' | 'doc';

export type DriveFile = {
  id: string;
  name: string;
  type: DriveFileType;
  size: string;
  date: string;
  uri?: string;
  preview?: string;
  thumb?: string | null;
  url?: string;
  star?: boolean;
  source?: string;
  tgFileId?: string;
  tgMessageId?: string | number;
  mimeType?: string;
};

export type DriveUploadItem = {
  id: string;
  name: string;
  type: DriveFileType;
  size: string;
  date: string;
  uri?: string;
  mimeType?: string;
};

type TelegramConfig = {
  name: string;
  token: string;
  chatId: string;
} | null;

type DriveContextValue = {
  files: DriveFile[];
  setFiles: React.Dispatch<React.SetStateAction<DriveFile[]>>;
  loading: boolean;
  telegramConfig: TelegramConfig;
  refreshDriveData: () => Promise<void>;
  uploadDriveFile: (item: DriveUploadItem, onProgress?: (progress: number) => void) => Promise<void>;
  deleteDriveFile: (file: DriveFile) => Promise<void>;
};

const DriveContext = createContext<DriveContextValue | null>(null);

const inferTypeFromExtension = (extension = ''): DriveFileType => {
  const ext = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return 'music';
  return 'doc';
};

const getFileExtension = (name = '') => {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0.0 MB';
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(1)} GB`;
  return `${Math.max(megabytes, 0.1).toFixed(1)} MB`;
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

const resolveTelegramFileUrl = async (tgToken: string, tgFileId: string) => {
  if (!tgToken || !tgFileId) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${tgToken}/getFile?file_id=${tgFileId}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${tgToken}/${data.result.file_path}`;
    }
  } catch (error) {
    console.warn('Could not resolve Telegram file URL:', error);
  }

  return null;
};

const buildDriveFile = async (doc: any, tgToken: string): Promise<DriveFile> => {
  const fileId = doc.file_id;
  const extension = (doc.Extension || doc.extension || '').toLowerCase();
  const type = inferTypeFromExtension(extension);
  const previewUrl = tgToken ? await resolveTelegramFileUrl(tgToken, fileId) : null;
  const rawSize = String(doc.size || '0 MB');
  const size = /(mb|kb|gb|b)$/i.test(rawSize) ? rawSize : `${rawSize} MB`;
  const rawDate = doc.created_at || doc.$createdAt || new Date().toISOString();

  return {
    id: doc.$id || doc.id || fileId,
    name: `telegram_${String(fileId).substring(0, 8)}${extension ? `.${extension}` : ''}`,
    type,
    size,
    date: new Date(rawDate).toISOString().split('T')[0],
    preview: previewUrl || '',
    thumb: type === 'image' || type === 'video' ? (previewUrl || '') : null,
    url: previewUrl || '',
    uri: doc.uri,
    star: false,
    source: 'telegram',
    tgFileId: fileId,
    tgMessageId: doc.message_id || doc.messageId || doc.$id || fileId,
  };
};

const sendTelegramUpload = async (
  tgToken: string,
  tgChatId: string,
  item: DriveUploadItem,
  onProgress?: (progress: number) => void
) => {
  const fileUri = item.uri || '';
  if (!fileUri) throw new Error('Missing file uri');

  const normalizedUri = fileUri.startsWith('file://') || fileUri.startsWith('content://') ? fileUri : `file://${fileUri}`;
  const uploadFile = new File(normalizedUri);
  const fieldName = item.type === 'image' ? 'photo' : item.type === 'video' ? 'video' : 'document';
  const endpoint = item.type === 'image' ? 'sendPhoto' : item.type === 'video' ? 'sendVideo' : 'sendDocument';
  const uploadUrl = `https://api.telegram.org/bot${tgToken}/${endpoint}`;

  const task = uploadFile.createUploadTask(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType: item.mimeType,
    parameters: {
      chat_id: tgChatId,
      caption: `Uploaded from T-Drive Mobile: ${item.name}\nDate: ${item.date}`,
    },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (onProgress && totalBytes > 0) {
        const progress = Math.min(100, Math.round((bytesSent / totalBytes) * 100));
        onProgress(progress);
      }
    },
  });

  const response = await task.uploadAsync();
  return JSON.parse(response.body || '{}');
};

export function DriveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(null);
  const mediaSyncRunningRef = useRef(false);

  const getMediaSyncKey = (userId: string) => `t-drive-auto-upload:${userId}`;

  const readSyncedAssetIds = async (userId: string) => {
    try {
      const raw = await AsyncStorage.getItem(getMediaSyncKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  };

  const writeSyncedAssetIds = async (userId: string, assetIds: Set<string>) => {
    await AsyncStorage.setItem(getMediaSyncKey(userId), JSON.stringify(Array.from(assetIds).slice(-1000)));
  };

  const buildUploadItemFromAsset = async (asset: any): Promise<DriveUploadItem | null> => {
    try {
      const uri = asset?.uri;
      if (!uri) return null;

      const filename = asset?.filename;
      const mediaType = asset?.mediaType;
      const createdAt = asset?.creationTime;
      const file = new File(uri);
      const type = mediaType === 'video' ? 'video' : 'image';

      return {
        id: asset.id,
        name: filename || `media_${asset.id}${file.extension || (type === 'image' ? '.jpg' : '.mp4')}`,
        type,
        size: formatBytes(file.size),
        date: new Date(createdAt || Date.now()).toISOString().split('T')[0],
        uri,
        mimeType: file.type || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      };
    } catch (error) {
      console.warn('Could not build gallery upload item:', error);
      return null;
    }
  };

  const refreshDriveData = async () => {
    const userId = user?.id;
    if (!userId) {
      setFiles([]);
      setTelegramConfig(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const config = await getTelegramConfig(userId);
      const token = config?.token || user?.user_metadata?.telegramBotToken || '';
      const chatId = config?.chat_id || user?.user_metadata?.telegramChatId || '';
      const name = config?.name || user?.user_metadata?.telegramBotName || '';

      setTelegramConfig(token && chatId ? { name, token, chatId } : null);

      const records = await getTelegramFileMetaList(userId);
      const telegramFiles = records.length > 0 ? await Promise.all(records.map((doc) => buildDriveFile(doc, token))) : [];

      setFiles((current) => {
        const localFiles = current.filter((item) => item.source !== 'telegram');
        return [...telegramFiles, ...localFiles];
      });
    } catch (error) {
      console.error('Failed to load drive data:', error);
      setFiles((current) => current.filter((item) => item.source !== 'telegram'));
    } finally {
      setLoading(false);
    }
  };

  const runMediaAutoSync = async () => {
    const userId = user?.id;
    const autoUploadEnabled = !!user?.user_metadata?.autoUploadLibrary;

    if (!userId || !autoUploadEnabled || Platform.OS === 'web' || mediaSyncRunningRef.current) {
      return;
    }

    const mediaLibrary = await getMediaLibrary();
    if (!mediaLibrary) {
      return;
    }

    const permission = await mediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
    if (!permission.granted) {
      return;
    }

    mediaSyncRunningRef.current = true;
    try {
      const syncedAssetIds = await readSyncedAssetIds(userId);
      const selectedAlbums = Array.isArray(user?.user_metadata?.autoUploadAlbums) ? user.user_metadata.autoUploadAlbums.filter(Boolean) : [];
      let assets: any[] = [];

      if (selectedAlbums.length > 0) {
        for (const title of selectedAlbums) {
          const album = await mediaLibrary.getAlbumAsync(title);
          if (!album) continue;

          let after: string | undefined;
          let hasNextPage = true;

          while (hasNextPage) {
            const page = await mediaLibrary.getAssetsAsync({
              album,
              first: 200,
              after,
              mediaType: [mediaLibrary.MediaType.photo, mediaLibrary.MediaType.video],
              sortBy: [[mediaLibrary.SortBy.creationTime, false]],
            });

            assets.push(...page.assets);
            hasNextPage = page.hasNextPage;
            after = page.endCursor;
          }
        }
      } else {
        let after: string | undefined;
        let hasNextPage = true;

        while (hasNextPage) {
          const page = await mediaLibrary.getAssetsAsync({
            first: 200,
            after,
            mediaType: [mediaLibrary.MediaType.photo, mediaLibrary.MediaType.video],
            sortBy: [[mediaLibrary.SortBy.creationTime, false]],
          });

          assets.push(...page.assets);
          hasNextPage = page.hasNextPage;
          after = page.endCursor;
        }
      }

      const uniqueAssets = Array.from(new Map(assets.map((asset) => [asset.id, asset])).values());
      let uploadedCount = 0;

      for (const asset of uniqueAssets) {
        if (syncedAssetIds.has(asset.id)) {
          continue;
        }

        const uploadItem = await buildUploadItemFromAsset(asset);
        if (!uploadItem) {
          continue;
        }

        try {
          await uploadDriveFile(uploadItem);
          syncedAssetIds.add(asset.id);
          uploadedCount += 1;
        } catch (error) {
          console.warn('Auto-upload failed for gallery item:', error);
        }
      }

      if (uploadedCount > 0) {
        await writeSyncedAssetIds(userId, syncedAssetIds);
      }
    } catch (error) {
      console.warn('Auto media sync failed:', error);
    } finally {
      mediaSyncRunningRef.current = false;
    }
  };

  useEffect(() => {
    refreshDriveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    void runMediaAutoSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.user_metadata?.autoUploadLibrary, JSON.stringify(user?.user_metadata?.autoUploadAlbums || [])]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runMediaAutoSync();
      }
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.user_metadata?.autoUploadLibrary, JSON.stringify(user?.user_metadata?.autoUploadAlbums || [])]);

  const uploadDriveFile = async (item: DriveUploadItem, onProgress?: (progress: number) => void) => {
    const userId = user?.id;
    const config = telegramConfig || (user?.user_metadata?.telegramBotToken && user?.user_metadata?.telegramChatId
      ? {
          name: user?.user_metadata?.telegramBotName || '',
          token: user.user_metadata.telegramBotToken,
          chatId: user.user_metadata.telegramChatId,
        }
      : null);

    const addLocalFile = () => {
      setFiles((current) => [
        {
          ...item,
          uri: item.uri,
          preview: item.uri || '',
          thumb: item.type === 'image' || item.type === 'video' ? item.uri || '' : null,
          url: item.uri || '',
          star: false,
          source: 'local',
        },
        ...current,
      ]);
      onProgress?.(100);
    };

    if (!config?.token || !config.chatId || !item.uri) {
      addLocalFile();
      return;
    }

    try {
      const response = await sendTelegramUpload(config.token, config.chatId, item, onProgress);
      const photo = response?.result?.photo;
      const fileId = response?.result?.document?.file_id || photo?.[photo.length - 1]?.file_id || response?.result?.video?.file_id;
      const messageId = response?.result?.message_id;

      if (fileId && userId) {
        await saveTelegramFileMeta({
          messageId,
          fileId,
          extension: getFileExtension(item.name),
          size: item.size,
          userId,
        });
      }

      const previewUrl = fileId ? await resolveTelegramFileUrl(config.token, fileId) : item.uri || '';

      setFiles((current) => [
        {
          id: fileId ? `tg_${fileId}` : item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          date: item.date,
          uri: item.uri,
          preview: previewUrl || '',
          thumb: item.type === 'image' || item.type === 'video' ? (previewUrl || '') : null,
          url: previewUrl || '',
          star: false,
          source: fileId ? 'telegram' : 'local',
          tgFileId: fileId,
          tgMessageId: messageId,
          mimeType: item.mimeType,
        },
        ...current,
      ]);
    } catch (error) {
      console.warn('Telegram upload failed, falling back to local storage:', error);
      addLocalFile();
    }
  };

  const deleteDriveFile = async (file: DriveFile) => {
    const userId = user?.id;

    if (!userId) {
      setFiles((current) => current.filter((item) => item.id !== file.id));
      return;
    }

    const shouldDeleteRemote = file.source === 'telegram' && !!file.tgFileId;
    if (shouldDeleteRemote) {
      const removed = await deleteTelegramFileMeta({ fileId: file.tgFileId, userId });
      if (!removed) {
        throw new Error('Failed to delete Telegram file metadata');
      }
    }

    setFiles((current) => current.filter((item) => item.id !== file.id));
  };

  return (
    <DriveContext.Provider value={{ files, setFiles, loading, telegramConfig, refreshDriveData, uploadDriveFile, deleteDriveFile }}>
      {children}
    </DriveContext.Provider>
  );
}

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};