import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Image } from "expo-image";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Colors } from "../../constants/theme";
import { Ic } from "../../constants/icons";
import { DriveFile } from "../../contexts/drive";

type Props = {
  file: DriveFile;
  isGrid: boolean;
  onPress: (file: DriveFile) => void;
  onDelete?: (file: DriveFile) => void | Promise<void>;
};

const getFileAccent = (type: DriveFile["type"]) => {
  if (type === "image") return "#10B981";
  if (type === "video") return "#14B8A6";
  if (type === "music") return "#3B82F6";
  if (type === "doc") return "#8B5CF6";
  return "#64748B";
};

const getIconForType = (type: DriveFile["type"]) => {
  if (type === "image") return Ic.Image;
  if (type === "video") return Ic.Video;
  if (type === "music") return Ic.Music;
  if (type === "doc") return Ic.Doc;
  return Ic.FileText;
};

const getPreviewUri = (file: DriveFile) =>
  file.thumb || file.preview || file.url || file.uri || "";

function DriveFileCardInner({ file, isGrid, onPress, onDelete }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const accent = useMemo(() => getFileAccent(file.type), [file.type]);
  const Icon = useMemo(() => getIconForType(file.type), [file.type]);
  const previewUri = getPreviewUri(file);
  const canShowImage = !!previewUri && (file.type === "image" || file.type === "video");
  const [imageLoading, setImageLoading] = useState(canShowImage);
  const [imageError, setImageError] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    setImageLoading(canShowImage);
    setImageError(false);
    setImageProgress(0);
  }, [canShowImage, file.id]);

  useEffect(() => {
    let cancelled = false;

    if (file.type !== "video" || !previewUri) {
      setVideoThumbnailUri(null);
      return () => {
        cancelled = true;
      };
    }

    setVideoThumbnailUri(null);

    void VideoThumbnails.getThumbnailAsync(previewUri, {
      time: 1000,
      quality: 0.7,
    })
      .then(({ uri }) => {
        if (!cancelled) {
          setVideoThumbnailUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoThumbnailUri(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file.id, file.type, previewUri]);

  const requestDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      `Delete "${file.name}"?`,
      "This will remove the file from the app list and delete its stored metadata when possible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void onDelete(file);
          },
        },
      ],
    );
  };

  return (
    <Pressable
      onPress={() => onPress(file)}
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.backgroundSelected,
          flexDirection: isGrid ? "column" : "row",
          width: "100%",
          height: isGrid ? 270 : 140,
        },
      ]}
    >
      <View
        style={[
          styles.previewWrap,
          { backgroundColor: `${accent}18` },
          isGrid ? styles.previewGrid : styles.previewList,
        ]}
      >
        {canShowImage && !imageError ? (
          <>
            {imageLoading ? (
              <View style={styles.imageLoaderOverlay}>
                <ActivityIndicator size="small" color={accent} />
                <Text
                  style={[
                    styles.imageLoaderText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Loading {Math.max(0, Math.min(100, imageProgress))}%
                </Text>
                <View style={styles.imageProgressTrack}>
                  <View
                    style={[
                      styles.imageProgressFill,
                      { width: `${Math.max(0, Math.min(100, imageProgress))}%`, backgroundColor: accent },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            <Image
              source={{ uri: file.type === "video" ? (videoThumbnailUri || previewUri) : previewUri }}
              style={styles.previewImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
              recyclingKey={String(file.id)}
              onLoadStart={() => {
                setImageLoading(true);
                setImageProgress(0);
              }}
              onProgress={(event: any) => {
                const loaded = event?.loaded ?? event?.nativeEvent?.loaded ?? 0;
                const total = event?.total ?? event?.nativeEvent?.total ?? 0;
                if (total > 0) {
                  setImageProgress(Math.round((loaded / total) * 100));
                }
              }}
              onLoadEnd={() => {
                setImageProgress(100);
                setImageLoading(false);
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
                setImageProgress(0);
              }}
            />
          </>
        ) : (
          <View style={styles.iconCenter}>
            <Icon size={isGrid ? 28 : 24} color={accent} />
          </View>
        )}
        {file.type === "video" ? (
          <View style={styles.playBadge}>
            <Ic.Play size={16} color="#FFFFFF" />
          </View>
        ) : null}
        {file.type === "music" ? (
          <View style={styles.audioBadge}>
            <Ic.Music size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {/* {file.type === "image" ? (
        // <View style={styles.previewStatusRow}>
        //   {imageLoading ? (
        //     <View style={styles.previewStatusPill}>
        //       <ActivityIndicator size="small" color={accent} />
        //       <Text
        //         style={[
        //           styles.previewStatusText,
        //           { color: colors.textSecondary },
        //         ]}
        //       >
        //         Loading image preview
        //       </Text>
        //     </View>
        //   ) : imageError ? (
        //     <View style={styles.previewStatusPill}>
        //       <Ic.Image size={12} color={colors.textSecondary} />
        //       <Text
        //         style={[
        //           styles.previewStatusText,
        //           { color: colors.textSecondary },
        //         ]}
        //       >
        //         Preview unavailable
        //       </Text>
        //     </View>
        //   ) : //   (

        //   //     <View style={styles.previewStatusPill}>
        //   //       <Ic.Check size={12} color={accent} />
        //   //       <Text style={[styles.previewStatusText, { color: colors.textSecondary }]}>Preview ready</Text>
        //   //     </View>
        //   //   )
        //   null}
        // </View>
      ) : null} */}

      <View
        style={[
          styles.metaWrap,
          isGrid ? styles.metaGrid : styles.metaList,
          isGrid && styles.metaGridWithBadge,
        ]}
      >
        <View style={styles.titleRow}>
          <Text
            numberOfLines={2}
            style={[styles.fileName, { color: colors.text }]}
          >
            {file.name}
          </Text>
          {file.star ? <Ic.Star size={14} color="#F59E0B" /> : null}
        </View>
        <Text
          style={[styles.fileMeta, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {file.size} • {new Date(file.date).toLocaleDateString()}
        </Text>
        <View style={styles.tagsRow}>
          <View style={[styles.typeTag, { backgroundColor: `${accent}18` }]}>
            <Text style={[styles.typeTagText, { color: accent }]}>
              {file.type.toUpperCase()}
            </Text>
          </View>
          {file.source ? (
            <View
              style={[
                styles.sourceTag,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Text
                style={[styles.sourceTagText, { color: colors.textSecondary }]}
              >
                {file.source}
              </Text>
            </View>
          ) : null}
        </View>
        {!isGrid && onDelete ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(16,185,129,0.08)",
                },
              ]}
              onPress={() => onPress(file)}
            >
              <Ic.Eye size={15} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(239,68,68,0.08)",
                },
              ]}
              onPress={requestDelete}
            >
              <Ic.Trash size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {isGrid && onDelete ? (
        <TouchableOpacity
          style={styles.gridDeleteButton}
          onPress={requestDelete}
        >
          <Ic.Trash size={14} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 108,
  },
  previewWrap: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  previewGrid: {
    width: "100%",
    height: 150,
  },
  previewList: {
    width: 84,
    height: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageLoaderOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    zIndex: 2,
  },
  imageLoaderText: {
    fontSize: 11,
    fontWeight: "700",
  },
  imageProgressTrack: {
    width: "72%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
  },
  imageProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  iconCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  playBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaWrap: {
    flex: 1,
    gap: 8,
  },
  metaGrid: {
    padding: 14,
  },
  metaGridWithBadge: {
    paddingRight: 48,
  },
  metaList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  previewStatusRow: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 0,
  },
  previewStatusPill: {
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  previewStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    minWidth: 0,
  },
  fileName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  fileMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridDeleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
});

export const DriveFileCard = memo(DriveFileCardInner);
