import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../constants/theme';
import IconButton from '../components/ui/IconButton';
import SegmentedControl from '../components/ui/SegmentedControl';
import BottomNav from '../components/ui/BottomNav';

type Tab = 'hard' | 'soft' | 'pairs';

const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

const HARD_STRATEGY: Record<number, Record<string, string>> = {
  5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'D' },
  12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'Rh','A':'Rh' },
  16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'Rh','10':'Rh','A':'Rh' },
  17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  18: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

const SOFT_STRATEGY: Record<number, Record<string, string>> = {
  13: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  16: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  17: { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  18: { '2':'Ds','3':'Ds','4':'Ds','5':'Ds','6':'Ds','7':'S','8':'S','9':'H','10':'H','A':'H' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'Ds','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

const PAIR_STRATEGY: Record<string, Record<string, string>> = {
  'A': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '10': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  '9': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'S','8':'P','9':'P','10':'S','A':'S' },
  '8': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '7': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
  '6': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '5': { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  '4': { '2':'H','3':'H','4':'H','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '3': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
  '2': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
};

const ACTION_COLORS: Record<string, string> = {
  'H': '#e53e3e',
  'S': '#38a169',
  'D': '#d69e2e',
  'P': '#3182ce',
  'Ds': '#805ad5',
  'Rh': '#ed8936',
};

export default function StrategyReferenceScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('hard');

  const segments = [
    { value: 'hard', label: t('strategy.hardTotals') },
    { value: 'soft', label: t('strategy.softTotals') },
    { value: 'pairs', label: t('strategy.pairSplitting') },
  ];

  const renderChart = (
    data: Record<string | number, Record<string, string>>,
    rowLabels: (string | number)[],
    rowPrefix: string,
  ) => (
    <View style={styles.chartContainer}>
      {/* Header row */}
      <View style={styles.chartRow}>
        <View style={styles.rowLabel}>
          <Text style={styles.headerText}>{t('strategy.dealerUpCard')}</Text>
        </View>
        {DEALER_COLS.map(col => (
          <View key={col} style={styles.cellHeader}>
            <Text style={styles.headerCellText}>{col}</Text>
          </View>
        ))}
      </View>

      {/* Data rows */}
      {rowLabels.map(row => (
        <View key={row} style={styles.chartRow}>
          <View style={styles.rowLabel}>
            <Text style={styles.rowLabelText}>{rowPrefix}{row}</Text>
          </View>
          {DEALER_COLS.map(col => {
            const action = data[row]?.[col] ?? 'H';
            return (
              <View key={col} style={[styles.cell, { backgroundColor: ACTION_COLORS[action] ?? '#666' }]}>
                <Text style={styles.cellText}>{action}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const hardRows = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const softRows = [13, 14, 15, 16, 17, 18, 19, 20, 21];
  const pairRows = ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        <View style={[styles.header, { borderColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0' }]}>
          <IconButton icon="arrow-back-ios-new" onPress={() => router.back()} iconColor={themeColors.text} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('strategy.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <SegmentedControl
          options={segments}
          selectedValue={tab}
          onSelect={(v) => setTab(v as Tab)}
          style={styles.segmentedControl}
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tab === 'hard' && renderChart(HARD_STRATEGY, hardRows, '')}
            {tab === 'soft' && renderChart(SOFT_STRATEGY, softRows, 'A+')}
            {tab === 'pairs' && renderChart(PAIR_STRATEGY, pairRows, '')}
          </ScrollView>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[styles.legendTitle, { color: themeColors.text }]}>{t('strategy.legend')}</Text>
            <View style={styles.legendGrid}>
              {[
                { code: 'H', label: t('strategy.hitDesc'), color: ACTION_COLORS.H },
                { code: 'S', label: t('strategy.standDesc'), color: ACTION_COLORS.S },
                { code: 'D', label: t('strategy.doubleDesc'), color: ACTION_COLORS.D },
                { code: 'P', label: t('strategy.splitDesc'), color: ACTION_COLORS.P },
                { code: 'Ds', label: t('strategy.dsDesc'), color: ACTION_COLORS.Ds },
                { code: 'Rh', label: t('strategy.rhDesc'), color: ACTION_COLORS.Rh },
              ].map(item => (
                <View key={item.code} style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.color }]}>
                    <Text style={styles.legendSwatchText}>{item.code}</Text>
                  </View>
                  <Text style={[styles.legendLabel, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      <BottomNav activeTab="strategy" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  segmentedControl: { marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  scrollView: { flex: 1, paddingHorizontal: 8 },
  chartContainer: { paddingVertical: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 48, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center' },
  rowLabelText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  headerText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '600' },
  cellHeader: { width: 32, height: 28, justifyContent: 'center', alignItems: 'center' },
  headerCellText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' },
  cell: {
    width: 32,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 1,
  },
  cellText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  legend: { paddingHorizontal: 8, paddingTop: 20 },
  legendTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  legendGrid: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendSwatch: { width: 32, height: 24, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  legendSwatchText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  legendLabel: { fontSize: 13 },
});
