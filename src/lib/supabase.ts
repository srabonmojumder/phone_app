import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder_key';

const memoryStorage = (() => {
  const store = new Map<string, string>();

  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
})();

const createSafeStorage = (backend: typeof AsyncStorage | Storage | null) => ({
  async getItem(key: string) {
    try {
      if (backend && 'getItem' in backend) {
        return await (backend as any).getItem(key);
      }
    } catch (error) {
      console.warn('Persistent storage unavailable, using in-memory fallback:', error);
    }

    return memoryStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    try {
      if (backend && 'setItem' in backend) {
        await (backend as any).setItem(key, value);
        return;
      }
    } catch (error) {
      console.warn('Persistent storage unavailable, using in-memory fallback:', error);
    }

    await memoryStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    try {
      if (backend && 'removeItem' in backend) {
        await (backend as any).removeItem(key);
        return;
      }
    } catch (error) {
      console.warn('Persistent storage unavailable, using in-memory fallback:', error);
    }

    await memoryStorage.removeItem(key);
  },
});

const storage =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? window.localStorage
      : memoryStorage
    : createSafeStorage(AsyncStorage);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const account = {
  create: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    if (!data.user) throw new Error("User creation failed");
    return { ...data.user, $id: data.user.id };
  },
  createEmailPasswordSession: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },
  get: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not found');
    return { ...user, $id: user.id };
  },
  updateProfile: async (data: { name?: string; telegramBotName?: string; telegramBotToken?: string; telegramChatId?: string; notifications?: Record<string, boolean>; autoUploadLibrary?: boolean; autoUploadAlbums?: string[] }) => {
    const { data: result, error } = await supabase.auth.updateUser({
      data,
    });

    if (error) throw error;
    if (!result.user) throw new Error('Profile update failed');

    return { ...result.user, $id: result.user.id };
  },
  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    if (!data.user) throw new Error('Password update failed');
    return { ...data.user, $id: data.user.id };
  },
  deleteSession: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

export const getTelegramConfig = async (userId: string) => {
  const { data, error } = await supabase
    .from('telegram_conf')
    .select('*')
    .eq('user_id', String(userId))
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      console.warn("Table does not exist yet.");
      return null;
    }
    console.error('Error fetching Telegram config:', error);
    return null;
  }
  return data ? { ...data, $id: data.id } : null;
};

export const saveTelegramConfig = async (userId: string, config: { name: string; token: string; chatId: string }) => {
  try {
    const existing = await getTelegramConfig(userId);
    const payload = {
      name: config.name,
      token: config.token,
      chat_id: config.chatId,
      user_id: String(userId),
    };

    if (existing) {
      const { data, error } = await supabase
        .from('telegram_conf')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, $id: data.id };
    }

    const { data, error } = await supabase
      .from('telegram_conf')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return { ...data, $id: data.id };
  } catch (err) {
    console.error('Error saving Telegram config:', err);
    return null;
  }
};

export const saveTelegramFileMeta = async ({ messageId, fileId, extension, size, userId }: { messageId?: number | string; fileId: string; extension?: string; size?: string; userId: string }) => {
  try {
    if (!fileId) return null;
    const payload = {
      file_id: fileId,
      Extension: extension || '',
      size: String(size || ''),
      user_id: String(userId),
    };

    const { data: existing, error: findError } = await supabase
      .from('storage')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', String(userId))
      .limit(1)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error checking existing storage record:', findError);
    }

    if (existing) {
      const { data, error } = await supabase
        .from('storage')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, $id: data.id };
    }

    const { data, error } = await supabase
      .from('storage')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return { ...data, $id: data.id };
  } catch (err) {
    console.error('Error saving Telegram file metadata:', err);
    return null;
  }
};

export const getTelegramFileMetaList = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('storage')
      .select('*')
      .eq('user_id', String(userId));
    if (error) throw error;
    return (data || []).map(d => ({ ...d, $id: d.id }));
  } catch (err) {
    console.error('Error loading Telegram file metadata:', err);
    return [];
  }
};

export const deleteTelegramFileMeta = async ({ fileId, userId, storageId }: { fileId?: string; userId: string; storageId?: string }) => {
  try {
    let query = supabase.from('storage').delete().eq('user_id', String(userId));

    if (storageId) {
      query = query.eq('id', storageId);
    } else if (fileId) {
      query = query.eq('file_id', fileId);
    } else {
      throw new Error('Missing file identifier for delete');
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting Telegram file metadata:', err);
    return false;
  }
};
