import { Image as ExpoImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  NativeModules,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ic } from "../../constants/icons";
import { Colors } from "../../constants/theme";
import { DriveFile } from "../../contexts/drive";

type Props = {
  visible: boolean;
  file: DriveFile | null;
  files?: DriveFile[];
  onClose: () => void;
  onDelete?: (file: DriveFile) => void | Promise<void>;
};

const resolvePreviewUri = (file: DriveFile | null) =>
  file?.url || file?.preview || file?.thumb || file?.uri || "";

export function FilePreviewModal({
  visible,
  file,
  files = [],
  onClose,
  onDelete,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const imageListRef = useRef<FlatList<DriveFile> | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const [imageIndex, setImageIndex] = useState(0);
  const [imageViewportWidth, setImageViewportWidth] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<string | null>(
    null,
  );

  const imageFiles = useMemo(
    () =>
      files.filter(
        (item) => item.type === "image" && !!resolvePreviewUri(item),
      ),
    [files],
  );

  const videoFiles = useMemo(
    () =>
      files.filter((item) => item.type === "video" && !!resolvePreviewUri(item)),
    [files],
  );

  useEffect(() => {
    if (!visible || !file) return;

    // If opening an image and there are images, jump to that image index.
    if (file.type === "image" && imageFiles.length > 0) {
      const foundIndex = imageFiles.findIndex((item) => item.id === file.id);
      const targetIndex = foundIndex >= 0 ? foundIndex : 0;
      setImageIndex(targetIndex);
      setShowDetails(false);
      setShowVideoPlayer(false);

      if (imageViewportWidth > 0) {
        requestAnimationFrame(() => {
          imageListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
        });
      }

      return;
    }

    // If opening a video and there are videos, jump to that video index and
    // open the same full-screen gallery shell as images.
    if (file.type === "video" && videoFiles.length > 0) {
      const foundIndex = videoFiles.findIndex((item) => item.id === file.id);
      const targetIndex = foundIndex >= 0 ? foundIndex : 0;
      setImageIndex(targetIndex);
      setShowDetails(false);
      setShowVideoPlayer(false);

      if (imageViewportWidth > 0) {
        requestAnimationFrame(() => {
          imageListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
        });
      }

      return;
    }

    setImageIndex(0);
    setShowDetails(false);
    setShowVideoPlayer(false);
  }, [visible, file, imageFiles, imageViewportWidth]);

  useEffect(() => {
    // Prefetch neighbouring media assets (images/videos posters) for smoother swiping.
    const pool = [...imageFiles, ...videoFiles];
    if (pool.length <= 1) return;

    const nearby = [pool[imageIndex - 1], pool[imageIndex + 1]].filter(Boolean);
    const nearbyUris = nearby.map((item) => resolvePreviewUri(item));
    if (nearbyUris.length === 0) return;

    void ExpoImage.prefetch(nearbyUris, "memory-disk");
  }, [imageFiles, videoFiles, imageIndex]);

  const activeFile =
    file?.type === "image" && imageFiles.length > 0
      ? imageFiles[imageIndex] || file
      : file?.type === "video" && videoFiles.length > 0
      ? videoFiles[imageIndex] || file
      : file;
  const previewUri = resolvePreviewUri(activeFile || null);
  const isImagePreview = activeFile?.type === "image" && !!previewUri;
  const isPdfPreview =
    activeFile?.type === "doc" &&
    !!previewUri &&
    (activeFile.mimeType === "application/pdf" ||
      activeFile.name.toLowerCase().endsWith(".pdf"));
  const [PdfView, setPdfView] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === "web" || !isPdfPreview) {
      setPdfView(null);
      return () => {
        cancelled = true;
      };
    }

    // If native UIManager isn't available yet, avoid requiring native modules.
    if (!NativeModules || !NativeModules.UIManager) {
      setPdfView(null);
      return () => {
        cancelled = true;
      };
    }

    try {
      const mod = require("react-native-pdf");
      const view = (mod && ((mod as any).default || (mod as any))) as any;
      if (!cancelled) setPdfView(view);
    } catch (error) {
      console.warn("react-native-pdf not available:", error);
      if (!cancelled) setPdfView(null);
    }

    return () => {
      cancelled = true;
    };
  }, [isPdfPreview]);

  useEffect(() => {
    let cancelled = false;

    if (activeFile?.type !== "video" || !previewUri) {
      setVideoThumbnailUri(null);
      return () => {
        cancelled = true;
      };
    }

    setVideoThumbnailUri(null);

    void VideoThumbnails.getThumbnailAsync(previewUri, {
      time: 1000,
      quality: 0.75,
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
  }, [activeFile?.id, activeFile?.type, previewUri]);

  const videoPlayer = useVideoPlayer(
    activeFile?.type === "video" && previewUri ? previewUri : null,
  );

  useEffect(() => {
    const subscription = videoPlayer.addListener(
      "statusChange",
      ({ status }) => {
        if (status === "error") {
          setShowVideoPlayer(false);
          Alert.alert(
            "Unable to play video",
            "This URL cannot be played inline.",
          );
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [videoPlayer]);

  const close = () => {
    onClose();
  };

  const openDocument = async () => {
    if (!previewUri) {
      Alert.alert(
        "No preview available",
        "This file does not have a preview URL yet.",
      );
      return;
    }

    try {
      await Linking.openURL(previewUri);
    } catch (error) {
      Alert.alert(
        "Unable to open file",
        "Could not open the document preview.",
      );
    }
  };

  const startVideoPlayback = () => {
    if (!previewUri) {
      openDocument();
      return;
    }

    setShowVideoPlayer(true);

    try {
      videoPlayer.replay();
      videoPlayer.play();
    } catch {
      openDocument();
    }
  };

  const requestDelete = () => {
    if (!activeFile || !onDelete) return;

    Alert.alert(
      `Delete "${activeFile.name}"?`,
      "This will remove the file from the app list and delete its stored metadata when possible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void onDelete(activeFile);
            onClose();
          },
        },
      ],
    );
  };

  if (!activeFile) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaView
        style={[styles.backdrop, { backgroundColor: colors.background }]}
      >
        {isImagePreview || activeFile?.type === "video" ? (
          <View style={styles.fullScreenRoot}>
            <View style={styles.topOverlay} pointerEvents="box-none">
              <View style={styles.topOverlayGroup}>
                <TouchableOpacity
                  onPress={close}
                  style={[
                    styles.overlayIconButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(15,23,42,0.84)"
                        : "rgba(17,24,39,0.72)",
                    },
                  ]}
                >
                  <Ic.X size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDetails((value) => !value)}
                  style={[
                    styles.overlayIconButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(15,23,42,0.84)"
                        : "rgba(17,24,39,0.72)",
                    },
                  ]}
                >
                  <Ic.FileText size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={requestDelete}
                style={[
                  styles.overlayIconButton,
                  { backgroundColor: "rgba(239,68,68,0.92)" },
                ]}
              >
                <Ic.Trash size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.galleryShell}>
              <FlatList
                ref={imageListRef}
                data={
                  activeFile?.type === "image"
                    ? imageFiles.length > 0
                      ? imageFiles
                      : [activeFile]
                    : activeFile?.type === "video"
                    ? videoFiles.length > 0
                      ? videoFiles
                      : [activeFile]
                    : [activeFile]
                }
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                bounces={false}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={imageIndex}
                getItemLayout={(_, index) => ({
                  length: imageViewportWidth || 1,
                  offset: (imageViewportWidth || 1) * index,
                  index,
                })}
                onLayout={(event) =>
                  setImageViewportWidth(event.nativeEvent.layout.width)
                }
                onViewableItemsChanged={({ viewableItems }) => {
                  const firstVisible = viewableItems[0];
                  if (
                    firstVisible?.index !== undefined &&
                    firstVisible.index !== null
                  ) {
                    setImageIndex(firstVisible.index);
                    setShowVideoPlayer(false);
                  }
                }}
                viewabilityConfig={viewabilityConfig.current}
                windowSize={3}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                removeClippedSubviews
                renderItem={({ item, index }) => {
                  const itemUri = resolvePreviewUri(item);

                  if (item.type === "image") {
                    return (
                      <View
                        style={[
                          styles.imageSlide,
                          imageViewportWidth > 0 && { width: imageViewportWidth },
                        ]}
                      >
                        <ExpoImage
                          source={{ uri: itemUri }}
                          style={styles.fullScreenImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          transition={120}
                          recyclingKey={`${String(item.id)}-${index}`}
                        />
                      </View>
                    );
                  }

                  // Video slide
                  return (
                    <View
                      style={[
                        styles.imageSlide,
                        imageViewportWidth > 0 && { width: imageViewportWidth },
                      ]}
                    >
                      {imageIndex === index && showVideoPlayer ? (
                        <VideoView
                          style={styles.fullScreenVideo}
                          player={videoPlayer}
                          nativeControls
                          contentFit="contain"
                          surfaceType="textureView"
                        />
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => {
                            setImageIndex(index);
                            startVideoPlayback();
                          }}
                          style={styles.videoPosterWrap}
                        >
                          <ExpoImage
                            source={{ uri: videoThumbnailUri || itemUri }}
                            style={styles.videoPoster}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={120}
                            recyclingKey={`${String(item.id)}-${index}`}
                          />
                          <View style={styles.videoPlayOverlay}>
                            <View style={styles.videoPlayButton}>
                              <Ic.Play size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.videoPlayText}>Tap to play video</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                onScrollToIndexFailed={() => {
                  if (imageViewportWidth > 0) {
                    requestAnimationFrame(() => {
                      imageListRef.current?.scrollToIndex({
                        index: imageIndex,
                        animated: false,
                      });
                    });
                  }
                }}
              />

              {(() => {
                const pool = activeFile?.type === "image" ? imageFiles : activeFile?.type === "video" ? videoFiles : [];
                if (pool.length > 1) {
                  return (
                    <View style={styles.pagerWrap}>
                      <Text style={styles.pagerText}>{imageIndex + 1} / {pool.length}</Text>
                    </View>
                  );
                }

                return null;
              })()}

              <View style={styles.swipeHintWrap} pointerEvents="none">
                <Text style={styles.swipeHintText}>
                  Swipe for next and previous image
                </Text>
              </View>
            </View>

            {showDetails ? (
              <View
                style={[
                  styles.detailsDrawer,
                  {
                    backgroundColor: isDark
                      ? "rgba(2,6,23,0.94)"
                      : "rgba(255,255,255,0.96)",
                    borderTopColor: colors.backgroundSelected,
                  },
                ]}
              >
                <View style={styles.detailsDrawerHeader}>
                  <Text
                    style={[styles.detailsTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {activeFile.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDetails(false)}
                    style={[
                      styles.detailsCloseButton,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                  >
                    <Ic.X size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.metaCardCompact}>
                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Type
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {activeFile.type}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Date
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {new Date(activeFile.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Source
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {activeFile.source || "local"}
                    </Text>
                  </View>
                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity
                      onPress={openDocument}
                      style={styles.primaryAction}
                    >
                      <Text style={styles.primaryActionText}>Open</Text>
                    </TouchableOpacity>
                    {onDelete ? (
                      <TouchableOpacity
                        onPress={requestDelete}
                        style={[
                          styles.secondaryAction,
                          { borderColor: colors.backgroundSelected },
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryActionText,
                            { color: colors.text },
                          ]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {activeFile.name}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {activeFile.type.toUpperCase()} • {activeFile.size}
                </Text>
              </View>
              <TouchableOpacity
                onPress={close}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Ic.X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {file?.type === "video" && previewUri ? (
                <View
                  style={[
                    styles.previewFrame,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  {showVideoPlayer ? (
                    <VideoView
                      style={styles.video}
                      player={videoPlayer}
                      nativeControls
                      contentFit="contain"
                      surfaceType="textureView"
                      onFirstFrameRender={() => setShowVideoPlayer(true)}
                    />
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={startVideoPlayback}
                      style={styles.videoPosterWrap}
                    >
                      <ExpoImage
                        source={{ uri: videoThumbnailUri || previewUri }}
                        style={styles.videoPoster}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={120}
                        recyclingKey={String(activeFile.id)}
                      />
                      <View style={styles.videoPlayOverlay}>
                        <View style={styles.videoPlayButton}>
                          <Ic.Play size={24} color="#FFFFFF" />
                        </View>
                        <Text style={styles.videoPlayText}>
                          Tap to play video
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ) : isPdfPreview ? (
                <View
                  style={[
                    styles.previewFrame,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                >
                  {PdfView ? (
                    <PdfView
                      source={{ uri: previewUri, cache: true }}
                      style={{
                        flex: 1,
                        width: "100%",
                        backgroundColor: "#F8FAFC",
                      }}
                      trustAllCerts={false}
                      enablePaging
                      onError={(error: unknown) => {
                        console.warn("PDF preview failed:", error);
                        Alert.alert(
                          "Unable to preview PDF",
                          "This file could not be rendered inline, so you can open it externally instead.",
                        );
                      }}
                      renderActivityIndicator={() => (
                        <View
                          style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                          }}
                        >
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "800",
                              color: "#8B5CF6",
                            }}
                          >
                            Loading PDF
                          </Text>
                        </View>
                      )}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={openDocument}
                      style={styles.mediaFallback}
                    >
                      <View style={styles.mediaBadge}>
                        <Ic.Pdf size={30} color="#EF4444" />
                      </View>
                      <Text
                        style={[styles.mediaTitle, { color: colors.text }]}
                      >
                        PDF preview is available on native builds
                      </Text>
                      <Text
                        style={[
                          styles.mediaSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Open the document externally on this platform.
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {activeFile.type === "music" ? (
                <View
                  style={[
                    styles.audioCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.audioIconWrap}>
                    <Ic.Music size={34} color="#3B82F6" />
                  </View>
                  <Text
                    style={[styles.audioTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {activeFile.name}
                  </Text>
                  <Text
                    style={[
                      styles.audioSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Audio preview from Telegram or local storage.
                  </Text>
                  <TouchableOpacity
                    onPress={openDocument}
                    style={styles.audioButton}
                  >
                    <Text style={styles.audioButtonText}>Open Audio</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {(
                (activeFile.type === "doc" && !isPdfPreview) ||
                (!["image", "video", "music"].includes(activeFile.type) &&
                  previewUri)
              ) ? (
                <View
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.docIconWrap}>
                    <Ic.FileText size={40} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.docTitle, { color: colors.text }]}>
                    {activeFile.name}
                  </Text>
                  <Text
                    style={[
                      styles.docSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Preview the document or open it externally.
                  </Text>
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      onPress={openDocument}
                      style={styles.primaryAction}
                    >
                      <Text style={styles.primaryActionText}>Open Preview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={close}
                      style={[
                        styles.secondaryAction,
                        { borderColor: colors.backgroundSelected },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { color: colors.text },
                        ]}
                      >
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View
                style={[
                  styles.metaCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              >
                <View style={styles.metaRow}>
                  <Text
                    style={[styles.metaLabel, { color: colors.textSecondary }]}
                  >
                    Type
                  </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {activeFile.type}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text
                    style={[styles.metaLabel, { color: colors.textSecondary }]}
                  >
                    Date
                  </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {new Date(activeFile.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text
                    style={[styles.metaLabel, { color: colors.textSecondary }]}
                  >
                    Source
                  </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {activeFile.source || "local"}
                  </Text>
                </View>
                {onDelete ? (
                  <TouchableOpacity
                    onPress={requestDelete}
                    style={styles.deleteButton}
                  >
                    <Ic.Trash size={16} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Delete file</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  fullScreenRoot: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topOverlayGroup: {
    flexDirection: "row",
    gap: 10,
  },
  overlayIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryShell: {
    flex: 1,
    backgroundColor: "#000000",
  },
  galleryContent: {
    flexGrow: 1,
    height: "100%",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenVideo: {
    width: "100%",
    height: "100%",
  },
  pagerWrap: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(15,23,42,0.68)",
  },
  pagerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  swipeHintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 54,
    alignItems: "center",
  },
  swipeHintText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "700",
  },
  detailsDrawer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  detailsDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailsTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  detailsCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metaCardCompact: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  detailActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    maxWidth: 260,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 14,
    paddingTop: 16,
    paddingBottom: 22,
  },
  previewFrame: {
    width: "100%",
    minHeight: 250,
    borderRadius: 24,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 360,
  },
  imageSlide: {
    width: "100%",
    flex: 1,
  },
  imagePager: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imagePagerText: {
    fontSize: 12,
    fontWeight: "800",
  },
  video: {
    width: "100%",
    height: 360,
  },
  videoPosterWrap: {
    width: "100%",
    minHeight: 280,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  videoPoster: {
    width: "100%",
    height: "100%",
    minHeight: 280,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    gap: 12,
  },
  videoPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.78)",
  },
  videoPlayText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  pdfViewer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#F8FAFC",
  },
  pdfLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pdfLoadingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8B5CF6",
  },
  mediaFallback: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  mediaBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "rgba(17,24,39,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  mediaSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  mediaAction: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 4,
  },
  mediaActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  audioCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  audioIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  audioSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  audioButton: {
    marginTop: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  audioButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  docCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  docIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(139,92,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  docSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  docActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryAction: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryActionText: {
    fontWeight: "900",
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
