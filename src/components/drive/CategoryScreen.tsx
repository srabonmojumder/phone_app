import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ic } from "../../constants/icons";
import { Colors } from "../../constants/theme";
import { useDrive } from "../../contexts/drive";
import { DriveFileCard } from "./DriveFileCard";
import { FilePreviewModal } from "./FilePreviewModal";

const computeSize = (sizeStr: any) => {
  if (!sizeStr) return 0;
  const s = sizeStr.toString().toUpperCase();
  const val = parseFloat(s);
  if (Number.isNaN(val)) return 0;
  if (s.includes("GB")) return val * 1024;
  if (s.includes("MB")) return val;
  if (s.includes("KB")) return val / 1024;
  if (s.includes("B")) return val / (1024 * 1024);
  return val / (1024 * 1024);
};

type Props = {
  title: string;
  subtitle: string;
  category: "files" | "image" | "video" | "music" | "doc";
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  accent: string;
};

export function CategoryScreen({
  title,
  subtitle,
  category,
  Icon,
  accent,
}: Props) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [query, setQuery] = useState("");
  const [isGrid, setIsGrid] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const { files: driveFiles, deleteDriveFile } = useDrive();

  const animateLayoutChange = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const files = useMemo(() => {
    return driveFiles.filter((file: any) => {
      const matchesCategory =
        category === "files" ? true : file.type === category;
      const matchesQuery = file.name
        ?.toLowerCase()
        .includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, driveFiles, query]);

  const totalMB = files.reduce(
    (sum: number, file: any) => sum + computeSize(file.size),
    0,
  );
  const starredCount = files.filter((file: any) => file.star).length;
  const displayedSize =
    totalMB > 1024
      ? `${(totalMB / 1024).toFixed(1)} GB`
      : `${totalMB.toFixed(1)} MB`;

  const handleDeleteFile = useCallback(
    async (file: any) => {
      await deleteDriveFile(file);
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
    },
    [deleteDriveFile, selectedFile?.id],
  );

  const renderFileItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={isGrid ? styles.gridItem : styles.listItem}>
        <DriveFileCard
          file={item}
          isGrid={isGrid}
          onPress={setSelectedFile}
          onDelete={handleDeleteFile}
        />
      </View>
    ),
    [handleDeleteFile, isGrid],
  );

  const listKey = `${category}-${isGrid ? "grid" : "list"}`;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <FlatList
        key={listKey}
        data={files}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.push("/(app)/menu")}
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                <Ic.Menu color={colors.text} size={20} />
              </TouchableOpacity>
              <View style={styles.iconButton} />
            </View>

            <View
              style={[
                styles.hero,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <View style={[styles.heroIconWrap, { backgroundColor: accent }]}>
                <Icon size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: colors.textSecondary }]}
              >
                {subtitle}
              </Text>

              <View style={styles.statRow}>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.55)",
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {files.length}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Items
                  </Text>
                </View>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.55)",
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {displayedSize}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Storage
                  </Text>
                </View>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.55)",
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {starredCount}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Starred
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <Ic.Search size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${title.toLowerCase()}`}
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Files
              </Text>
              <View style={styles.sectionActions}>
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
                      animateLayoutChange();
                      setIsGrid(true);
                    }}
                    style={[
                      styles.layoutToggleButton,
                      isGrid && { backgroundColor: accent },
                    ]}
                  >
                    <Ic.Grid
                      size={14}
                      color={isGrid ? "#FFFFFF" : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      animateLayoutChange();
                      setIsGrid(false);
                    }}
                    style={[
                      styles.layoutToggleButton,
                      !isGrid && { backgroundColor: accent },
                    ]}
                  >
                    <Ic.List
                      size={14}
                      color={!isGrid ? "#FFFFFF" : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Info",
                      "This screen is already filtered by category.",
                    )
                  }
                >
                  <Text style={[styles.sectionAction, { color: accent }]}>
                    Filtered
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(16,185,129,0.08)",
                },
              ]}
            >
              <Icon size={34} color={accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No files found
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Connect Telegram sync or upload files to populate this section.
            </Text>
          </View>
        }
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? styles.gridRow : undefined}
        initialNumToRender={isGrid ? 8 : 6}
        maxToRenderPerBatch={isGrid ? 8 : 6}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        extraData={isGrid}
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
  container: { padding: 20, paddingBottom: 120, gap: 16 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 10,
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 28, fontWeight: "900" },
  heroSubtitle: { fontSize: 14, lineHeight: 20 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statValue: { fontSize: 16, fontWeight: "900", marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionAction: { fontSize: 12, fontWeight: "800" },
  emptyState: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
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
  gridRow: { justifyContent: "space-between" },
  gridItem: { width: "48%", marginBottom: 12 },
  listItem: { width: "100%", marginBottom: 12 },
});
