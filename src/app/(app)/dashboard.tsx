"use client";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
    Dimensions,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { DriveFileCard } from "../../components/drive/DriveFileCard";
import { FilePreviewModal } from "../../components/drive/FilePreviewModal";
import { UploadModal } from "../../components/drive/UploadModal";
import { Ic } from "../../constants/icons";
import { Colors } from "../../constants/theme";
import { useAuth } from "../../contexts/auth";
import { useDrive } from "../../contexts/drive";
import { account } from "../../lib/supabase";

const { width } = Dimensions.get("window");

const computeSize = (sizeStr: any) => {
  if (!sizeStr) return 0;
  const s = sizeStr.toString().toUpperCase();
  const val = parseFloat(s);
  if (isNaN(val)) return 0;
  if (s.includes("GB")) return val * 1024;
  if (s.includes("MB")) return val;
  if (s.includes("KB")) return val / 1024;
  if (s.includes("B")) return val / (1024 * 1024);
  return val / (1024 * 1024);
};

const formatStorageSize = (totalMB: number) => {
  if (!Number.isFinite(totalMB) || totalMB <= 0) {
    return "0 MB";
  }

  if (totalMB >= 1024) {
    return `${(totalMB / 1024).toFixed(1)} GB`;
  }

  if (totalMB >= 1) {
    return `${totalMB.toFixed(1)} MB`;
  }

  return `${Math.round(totalMB * 1024)} KB`;
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const { files, loading, uploadDriveFile, deleteDriveFile } = useDrive();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [recentLayout, setRecentLayout] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const animateRecentLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "there";

  const totalMB = files.reduce((acc, f) => acc + computeSize(f.size), 0);
  const maxStorageMB = 100 * 1024;
  const storagePercent = Math.min((totalMB / maxStorageMB) * 100, 100).toFixed(
    0,
  );
  const usedSpaceStr = formatStorageSize(totalMB);
  const sharedCount = files.filter((f) => f.star).length;

  const categorySizes = { image: 0, video: 0, doc: 0, music: 0, other: 0 };
  files.forEach((f) => {
    const size = computeSize(f.size);
    if (f.type in categorySizes)
      categorySizes[f.type as keyof typeof categorySizes] += size;
    else categorySizes.other += size;
  });

  const getStorageDetails = (type: string, label: string, color: string) => {
    const size = categorySizes[type as keyof typeof categorySizes];
    const percent = totalMB > 0 ? (size / totalMB) * 100 : 0;
    return {
      name: label,
      population: Number(percent.toFixed(1)),
      color,
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    };
  };

  const chartData = [
    getStorageDetails("image", "Images", "#10B981"),
    getStorageDetails("video", "Videos", "#14B8A6"),
    getStorageDetails("doc", "Docs", "#06B6D4"),
    getStorageDetails("music", "Music", "#3B82F6"),
    getStorageDetails("other", "Other", "#64748B"),
  ];

  const activityBuckets = [0, 0, 0, 0, 0, 0, 0];
  files.forEach((file) => {
    const date = new Date(file.date);
    if (Number.isNaN(date.getTime())) return;
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    activityBuckets[dayIndex] += computeSize(file.size);
  });

  const activityData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: activityBuckets.map((value) => Math.max(5, Math.round(value))),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const stats = [
    {
      title: "Total Files",
      val: files.length,
      sub: "In your drive",
      ic: <Ic.FileText color="#10B981" />,
    },
    {
      title: "Used Space",
      val: usedSpaceStr,
      sub: "of 100 GB",
      ic: <Ic.HardDrive color="#3B82F6" />,
    },
    {
      title: "Starred",
      val: sharedCount,
      sub: "important files",
      ic: <Ic.Star color="#8B5CF6" />,
    },
  ];

  const quickActions = [
    {
      ic: <Ic.Image color="#60A5FA" />,
      label: "Images",
      desc: "Photos and graphics",
      route: "/(app)/image",
    },
    {
      ic: <Ic.Video color="#34D399" />,
      label: "Videos",
      desc: "Movies and clips",
      route: "/(app)/video",
    },
    {
      ic: <Ic.Music color="#C084FC" />,
      label: "Music",
      desc: "Songs and audio",
      route: "/(app)/music",
    },
    {
      ic: <Ic.Doc color="#F59E0B" />,
      label: "Documents",
      desc: "Docs and files",
      route: "/(app)/doc",
    },
  ];

  const handleLogout = async () => {
    try {
      await account.deleteSession();
      router.replace("/(auth)/login");
    } catch {}
  };

  const { upload } = useLocalSearchParams();

  const closeProfileMenu = () => setProfileMenuOpen(false);

  const openSettings = () => {
    closeProfileMenu();
    router.push("/(app)/settings");
  };

  const openAnalytics = () => {
    closeProfileMenu();
    router.push("/(app)/analytics");
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = null;
    }, 2800) as any;
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const openUploadModal = () => {
    closeProfileMenu();
    setUploadModalOpen(true);
  };

  useEffect(() => {
    if (upload) {
      setUploadModalOpen(true);
    }
  }, [upload]);

  const openFilePreview = (file: any) => setSelectedFile(file);

  const handleDeleteFile = async (file: any) => {
    await deleteDriveFile(file);
    if (selectedFile?.id === file.id) setSelectedFile(null);
  };

  const handleUploadMultiple = async (items: any[]) => {
    setUploadProgress(0);
    setIsUploading(true);
    showToast(`Uploading ${items.length} files...`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await uploadDriveFile(item, (progress: number) => {
          const overallProgress = Math.round(
            ((i + progress / 100) / items.length) * 100,
          );
          setUploadProgress(overallProgress);
        });
        successCount++;
      } catch (error) {
        console.warn(`Upload failed for ${item.name}:`, error);
        failureCount++;
      }
    }

    const message =
      failureCount === 0
        ? `${successCount} files uploaded`
        : `${successCount} uploaded, ${failureCount} failed`;
    showToast(message);
    setIsUploading(false);
    setTimeout(() => setUploadProgress(null), 1400);
  };

  const handleUpload = async (item: any) => {
    setUploadProgress(0);
    setIsUploading(true);
    showToast("Upload started");

    try {
      await uploadDriveFile(item, (progress: number) => {
        setUploadProgress(progress);
      });
      showToast("Upload completed");
    } catch (error) {
      console.warn("Upload failed:", error);
      showToast("Upload failed");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1400);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.appBarMenu}
          onPress={() => router.push("/(app)/menu")}
        >
          <Ic.Menu size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.appBarTitleWrap}>
          <View style={styles.appBarLogo}>
            <Ic.Sparkles size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.appBarTitle, { color: colors.text }]}>
            T-Drive
          </Text>
        </View>
        <TouchableOpacity
          style={styles.appBarAvatar}
          onPress={() => setProfileMenuOpen((current) => !current)}
        >
          <Text style={styles.appBarAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {toastVisible ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.backgroundSelected,
            },
          ]}
        >
          <Text style={[styles.toastText, { color: colors.text }]}>
            {toastMessage}
          </Text>
        </View>
      ) : null}

      {uploadProgress !== null ? (
        <View
          style={[
            styles.uploadProgressBox,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.backgroundSelected,
            },
          ]}
        >
          <View style={styles.uploadProgressTrack}>
            <View
              style={[
                styles.uploadProgressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
          <Text style={[styles.uploadProgressLabel, { color: colors.text }]}>
            {isUploading ? `Uploading ${uploadProgress}%` : "Upload complete"}
          </Text>
        </View>
      ) : null}

      {profileMenuOpen ? (
        <View style={styles.profileMenuLayer} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeProfileMenu}
          />
          <View
            style={[
              styles.profileMenu,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
          >
            <Text style={[styles.profileMenuName, { color: colors.text }]}>
              {displayName}
            </Text>
            <Text
              style={[styles.profileMenuEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {user?.email}
            </Text>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={openSettings}
            >
              <Ic.Settings size={18} color={colors.text} />
              <Text
                style={[styles.profileMenuItemText, { color: colors.text }]}
              >
                Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={openAnalytics}
            >
              <Ic.BarChart size={18} color={colors.text} />
              <Text
                style={[styles.profileMenuItemText, { color: colors.text }]}
              >
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleLogout}
            >
              <Ic.Shield size={18} color="#EF4444" />
              <Text style={[styles.profileMenuItemText, { color: "#EF4444" }]}>
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading your drive...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {displayName} 👋
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
        >
          {stats.map((s, i) => (
            <View
              key={i}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                  borderWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                {s.ic}
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {s.val}
              </Text>
              <Text style={[styles.statTitle, { color: colors.text }]}>
                {s.title}
              </Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>
                {s.sub}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chartsContainer}>
          <View
            style={[
              styles.chartBox,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 8 },
              ]}
            >
              Storage Usage
            </Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={chartData}
                width={width - 70}
                height={180}
                chartConfig={{
                  backgroundColor: colors.backgroundElement,
                  backgroundGradientFrom: colors.backgroundElement,
                  backgroundGradientTo: colors.backgroundElement,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"0"}
                absolute
              />
            </View>
            <View style={styles.storageSummary}>
              <Text style={[styles.storageTotal, { color: colors.text }]}>
                {usedSpaceStr} / 100 GB
              </Text>
              <Text
                style={[
                  styles.storagePercentText,
                  { color: colors.textSecondary },
                ]}
              >
                {storagePercent}% Used
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.chartBox,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 8 },
              ]}
            >
              Activity
            </Text>
            <LineChart
              data={activityData}
              width={width - 70}
              height={220}
              withDots
              withShadow
              withInnerLines={false}
              chartConfig={{
                backgroundColor: colors.backgroundElement,
                backgroundGradientFrom: colors.backgroundElement,
                backgroundGradientTo: colors.backgroundElement,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#10B981",
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                alignSelf: "center",
              }}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Access
        </Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.quickCard,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                  borderWidth: 1,
                },
              ]}
              onPress={() => router.push(action.route as any)}
            >
              <View
                style={[
                  styles.quickIconContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                {action.ic}
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>
                {action.label}
              </Text>
              <Text style={[styles.quickDesc, { color: colors.textSecondary }]}>
                {action.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginBottom: 0 },
            ]}
          >
            Recent Files
          </Text>
          <View style={styles.recentActions}>
            <View
              style={[
                styles.layoutToggle,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  animateRecentLayout();
                  setRecentLayout("grid");
                }}
                style={[
                  styles.layoutToggleButton,
                  recentLayout === "grid" && { backgroundColor: "#10B981" },
                ]}
              >
                <Ic.Grid
                  size={14}
                  color={
                    recentLayout === "grid" ? "#FFFFFF" : colors.textSecondary
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  animateRecentLayout();
                  setRecentLayout("list");
                }}
                style={[
                  styles.layoutToggleButton,
                  recentLayout === "list" && { backgroundColor: "#10B981" },
                ]}
              >
                <Ic.List
                  size={14}
                  color={
                    recentLayout === "list" ? "#FFFFFF" : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity>
              <Text style={{ color: "#10B981", fontWeight: "600" }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {files.length === 0 ? (
          <View style={styles.emptyState}>
            <Ic.Folder size={48} color={colors.textSecondary} />
            <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
              No files found
            </Text>
          </View>
        ) : (
          <View
            style={
              recentLayout === "grid" ? styles.recentGrid : styles.fileList
            }
          >
            {files.slice(0, recentLayout === "grid" ? 4 : 6).map((file, i) => (
              <View
                key={file.id || i}
                style={
                  recentLayout === "grid"
                    ? styles.recentGridItem
                    : styles.recentListItem
                }
              >
                <DriveFileCard
                  file={file}
                  isGrid={recentLayout === "grid"}
                  onPress={openFilePreview}
                  onDelete={handleDeleteFile}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      )}

      <UploadModal
        visible={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        onUploadMultiple={handleUploadMultiple}
      />
      <FilePreviewModal
        visible={!!selectedFile}
        file={selectedFile}
        files={files}
        onClose={() => setSelectedFile(null)}
        onDelete={handleDeleteFile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  appBarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  appBarAvatarText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  profileMenuLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  appBarMenu: {
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  appBarLogo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  profileMenu: {
    position: "absolute",
    top: Platform.OS === "android" ? 1 : 3,
    right: 16,
    width: 220,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: "900",
  },
  profileMenuEmail: {
    fontSize: 12,
    marginBottom: 4,
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  profileMenuItemText: {
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    padding: 20,
    paddingBottom: 124,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  header: { marginBottom: 24 },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 26,
    fontWeight: "900",
  },
  statsScroll: { marginBottom: 32 },
  statCard: {
    width: 150,
    padding: 16,
    borderRadius: 20,
    marginRight: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statSub: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chartsContainer: {
    marginBottom: 32,
    gap: 16,
  },
  chartBox: {
    padding: 20,
    borderRadius: 24,
  },
  pieContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  storageSummary: {
    alignItems: "center",
    marginTop: 10,
  },
  storageTotal: {
    fontSize: 16,
    fontWeight: "bold",
  },
  storagePercentText: {
    fontSize: 12,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  quickCard: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  quickIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  quickDesc: {
    fontSize: 12,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  recentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  layoutToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  layoutToggleButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fileList: { gap: 12 },
  recentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recentGridItem: {
    width: "48%",
    marginBottom: 12,
  },
  recentListItem: {
    width: "100%",
    marginBottom: 12,
  },
  fileMeta: { fontSize: 12 },
  toast: {
    position: "absolute",
    top: Platform.OS === "android" ? 74 : 84,
    left: 20,
    right: 20,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    zIndex: 55,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "700",
  },
  uploadProgressBox: {
    position: "absolute",
    top: Platform.OS === "android" ? 130 : 140,
    left: 20,
    right: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    zIndex: 54,
  },
  uploadProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(16, 185, 129, 0.16)",
    overflow: "hidden",
  },
  uploadProgressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  uploadProgressLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  bottomLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
});
