import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ic } from '../../constants/icons';
import { useDrive } from '../../contexts/drive';

const { width } = Dimensions.get('window');

const computeSize = (sizeStr: any) => {
  if (!sizeStr) return 0;
  const s = sizeStr.toString().toUpperCase();
  const val = parseFloat(s);
  if (Number.isNaN(val)) return 0;
  if (s.includes('GB')) return val * 1024;
  if (s.includes('MB')) return val;
  if (s.includes('KB')) return val / 1024;
  if (s.includes('B')) return val / (1024 * 1024);
  return val / (1024 * 1024);
};

export function AnalyticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { files } = useDrive();

  const dynamicStats = useMemo(() => {
    const totalMB = files.reduce((sum: number, file: any) => sum + computeSize(file.size), 0);
    const starred = files.filter((file: any) => file.star).length;
    const todayCount = files.filter((file: any) => {
      const fileDate = new Date(file.date);
      const now = new Date();
      return fileDate.toDateString() === now.toDateString();
    }).length;
    return { totalMB, starred, todayCount };
  }, [files]);

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: (() => {
          const bucket = [0, 0, 0, 0, 0, 0, 0];
          files.forEach((file: any) => {
            const fileDate = new Date(file.date);
            if (Number.isNaN(fileDate.getTime())) return;
            const dayIndex = fileDate.getDay() === 0 ? 6 : fileDate.getDay() - 1;
            bucket[dayIndex] += computeSize(file.size);
          });
          return bucket.map((value) => Math.max(5, Math.round(value)));
        })(),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieChartData = useMemo(() => {
    const categories = [
      { key: 'image', name: 'Images', color: '#10B981' },
      { key: 'video', name: 'Videos', color: '#059669' },
      { key: 'doc', name: 'Docs', color: '#34D399' },
      { key: 'music', name: 'Music', color: '#6EE7B7' },
      { key: 'other', name: 'Other', color: '#A7F3D0' },
    ];

    const totals = { image: 0, video: 0, doc: 0, music: 0, other: 0 };

    files.forEach((file: any) => {
      const key = file.type in totals ? file.type : 'other';
      totals[key as keyof typeof totals] += computeSize(file.size);
    });

    return categories.map((item) => ({
      name: item.name,
      population: totals[item.key as keyof typeof totals],
      color: item.color,
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    }));
  }, [colors.textSecondary, files]);

  const storagePercent = Math.min(Math.round((dynamicStats.totalMB / (100 * 1024)) * 100), 100);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/(app)/menu')} style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}> 
            <Ic.Menu size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.iconButton} />
        </View>

        <View style={[styles.hero, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
          <View style={styles.heroRow}>
            <View>
              <Text style={[styles.heroKicker, { color: colors.textSecondary }]}>Drive insights</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Storage and activity</Text>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{storagePercent}%</Text>
            </View>
          </View>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>These charts are backed by the current drive file list, so the screen stays dynamic even when your content changes.</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{dynamicStats.todayCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Today</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{dynamicStats.starred}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Starred</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{dynamicStats.totalMB > 1024 ? `${(dynamicStats.totalMB / 1024).toFixed(1)} GB` : `${dynamicStats.totalMB.toFixed(1)} MB`}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Used</Text>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Storage breakdown</Text>
          <PieChart
            data={pieChartData}
            width={width - 40}
            height={190}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            center={[10, 0]}
            absolute
            chartConfig={{
              backgroundColor: colors.backgroundElement,
              backgroundGradientFrom: colors.backgroundElement,
              backgroundGradientTo: colors.backgroundElement,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
          />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly activity</Text>
          <LineChart
            data={lineChartData}
            width={width - 40}
            height={240}
            bezier
            withDots
            withShadow={false}
            withInnerLines={false}
            chartConfig={{
              backgroundColor: colors.backgroundElement,
              backgroundGradientFrom: colors.backgroundElement,
              backgroundGradientTo: colors.backgroundElement,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              labelColor: (opacity = 1) => colors.textSecondary,
              propsForBackgroundLines: { stroke: colors.backgroundSelected },
            }}
            style={styles.lineChart}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 120, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 28, padding: 20, gap: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heroKicker: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroText: { fontSize: 14, lineHeight: 20 },
  percentBadge: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#10B981' },
  percentBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 14, gap: 6 },
  metricValue: { fontSize: 16, fontWeight: '900' },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  chartCard: { borderWidth: 1, borderRadius: 28, padding: 18 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  lineChart: { marginTop: 4, borderRadius: 18, alignSelf: 'center' },
});
