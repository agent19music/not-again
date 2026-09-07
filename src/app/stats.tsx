import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeriodToggle } from '@/components/period-toggle';
import { RankList } from '@/components/rank-list';
import SafeText from '@/components/safe-text';
import { ScreenHeader } from '@/components/screen-header';
import { StatTile } from '@/components/stat-tile';
import { WeekBars } from '@/components/week-bars';
import { Spacing } from '@/constants/theme';
import { useGoonEntries } from '@/hooks/use-goon-entries';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  computeDigest,
  computeWeekStats,
  formatDuration,
  rangeForPeriod,
  type PeriodKey,
} from '@/lib/digest';

const PERIOD_LABEL: Record<PeriodKey, string> = {
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

function deltaHint(deltaPct: number | null) {
  if (deltaPct === null) return 'First week tracked';
  if (deltaPct === 0) return 'Same as last week';
  if (deltaPct < 0) return `${Math.abs(deltaPct)}% fewer than last week`;
  return `${deltaPct}% more than last week`;
}

export default function StatsScreen() {
  const colors = useTheme();
  const now = useNow();
  const { entries } = useGoonEntries();
  const [period, setPeriod] = useState<PeriodKey>('week');

  const digest = computeDigest(entries, now);
  const periodStats =
    period === 'week'
      ? digest.thisWeek
      : computeWeekStats(entries, rangeForPeriod(period, entries, now), now);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Stats" />

        {entries.length === 0 ? (
          <SafeText variant="body" color="textSecondary">
            Once you log a goon, your weekly digest and patterns will show up here.
          </SafeText>
        ) : (
          <>
            <PeriodToggle value={period} onChange={setPeriod} />

            <View style={styles.tileRow}>
              <StatTile
                label={PERIOD_LABEL[period]}
                value={String(periodStats.count)}
                hint={period === 'week' ? deltaHint(digest.deltaPct) : undefined}
              />
              <StatTile
                label="Longest stretch"
                value={digest.longestGapMs !== null ? formatDuration(digest.longestGapMs) : '-'}
                hint="between goons"
              />
              <StatTile
                label="Today"
                value={String(digest.thisWeek.todayCount)}
                hint="logged today"
              />
            </View>

            {period === 'week' ? (
              <View style={styles.section}>
                <SafeText variant="label" color="textSecondary">
                  This week by day
                </SafeText>
                <WeekBars byDay={periodStats.byDay} />
              </View>
            ) : null}

            <RankList title="Common sites" items={periodStats.topSites.slice(0, 6)} />
            <RankList title="Common subjects" items={periodStats.topSubjects.slice(0, 6)} />

            <View style={styles.footer}>
              <SafeText variant="caption" color="textMuted">
                {digest.totalCount} total logged, all stored only on this device.
              </SafeText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.s20,
    gap: Spacing.s24,
    paddingBottom: Spacing.s64,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.s12,
  },
  section: {
    gap: Spacing.s16,
  },
  footer: {
    paddingTop: Spacing.s8,
  },
});
