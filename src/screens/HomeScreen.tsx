import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {ToolCard} from '@/components/ToolCard';
import {QuotaPill} from '@/components/QuotaPill';
import {AdBanner} from '@/components/AdBanner';
import {GROUPS, TOOLS, type Tool} from '@/convert/catalog';
import {palette, radius, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({navigation}: Props) => {
  const [group, setGroup] = useState<Tool['group'] | 'All'>('All');

  // Two cards side by side on a phone, more when there is room — a rotated phone,
  // a foldable opened out, a tablet. Fixing it at two made each card enormous and
  // wasted most of a wide screen. 190 is about the narrowest a card reads well at.
  const {width} = useWindowDimensions();
  const columns = Math.min(4, Math.max(2, Math.floor(Math.min(width, 720) / 190)));

  const tools = useMemo(
    () => (group === 'All' ? TOOLS : TOOLS.filter(t => t.group === group)),
    [group],
  );

  const open = (tool: Tool) => navigation.navigate('Convert', {toolId: tool.id});

  return (
    <Screen
      title="Convert a file"
      subtitle="Everything happens on your phone."
      right={<QuotaPill onPress={() => navigation.navigate('Premium')} />}
      footer={<AdBanner />}>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Viewer', {})}
        style={({pressed}) => [styles.viewer, pressed && styles.viewerPressed]}>
        <View style={styles.viewerText}>
          <Text style={styles.viewerTitle}>View a file</Text>
          <Text style={styles.viewerHint}>Open a PDF, document, sheet or archive without converting it</Text>
        </View>
        <Text style={styles.viewerChevron}>›</Text>
      </Pressable>

      <View style={styles.filters}>
        {(['All', ...GROUPS] as const).map(g => {
          const active = group === g;
          return (
            <Pressable
              key={g}
              accessibilityRole="button"
              onPress={() => setGroup(g)}
              style={[styles.filter, active && styles.filterActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{g}</Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View key={group} entering={FadeIn.duration(220)} style={styles.grid}>
        {tools.map((tool, i) => (
          <View key={tool.id} style={[styles.cell, {width: `${100 / columns}%`}]}>
            <ToolCard tool={tool} index={i} onPress={open} />
          </View>
        ))}
      </Animated.View>

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate('History')} style={styles.link}>
          <Text style={styles.linkText}>Recent files</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Settings')} style={styles.link}>
          <Text style={styles.linkText}>Settings</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  viewer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
  },
  viewerPressed: {opacity: 0.85},
  viewerText: {flex: 1, gap: 2},
  viewerTitle: {...type.section, color: palette.ink},
  viewerHint: {...type.caption, color: palette.inkFaint},
  viewerChevron: {...type.title, color: palette.inkFaint},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg},
  filter: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  filterActive: {backgroundColor: palette.ink, borderColor: palette.ink},
  filterText: {...type.caption, color: palette.inkSoft},
  filterTextActive: {color: '#FFFFFF'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm / 2},
  cell: {paddingHorizontal: space.sm / 2, paddingBottom: space.md},
  links: {flexDirection: 'row', gap: space.md, marginTop: space.sm},
  link: {
    flex: 1,
    paddingVertical: space.lg,
    borderRadius: radius.card,
    backgroundColor: palette.surfaceSunk,
    alignItems: 'center',
  },
  linkText: {...type.section, color: palette.ink},
});
