import React from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {ToolCard} from '@/components/ToolCard';
import {AdBanner} from '@/components/AdBanner';
import {toolsForKind} from '@/convert/catalog';
import {makeStyles, radius, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OpenWith'>;

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/**
 * Where a file goes when another app opens it here and it is something this app can
 * edit rather than only read. The file is already loaded: picking a tool opens it
 * with the file in place, so there is nothing to choose a second time.
 */
export const OpenWithScreen = ({route, navigation}: Props) => {
  const styles = useStyles();
  const {file, kind} = route.params;
  const tools = toolsForKind(kind);

  const {width} = useWindowDimensions();
  const columns = Math.min(4, Math.max(2, Math.floor(Math.min(width, 900) / 190)));

  return (
    <Screen title="What to do with it?" subtitle={file.name} footer={<AdBanner />}>
      {kind === 'pdf' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Viewer', {file})}
          style={({pressed}) => [styles.view, pressed && styles.pressed]}>
          <View style={styles.viewText}>
            <Text style={styles.viewTitle}>View this file</Text>
            <Text style={styles.viewHint}>Read it here without changing it</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {file.size ? <Text style={styles.meta}>{formatSize(file.size)}</Text> : null}

      <View style={styles.grid}>
        {tools.map((tool, i) => (
          <View key={tool.id} style={[styles.cell, {width: `${100 / columns}%`}]}>
            <ToolCard
              tool={tool}
              index={i}
              onPress={t => navigation.navigate('Convert', {toolId: t.id, initialFile: file})}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  view: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.lg,
  },
  pressed: {opacity: 0.85},
  viewText: {flex: 1, gap: 2},
  viewTitle: {...type.section, color: palette.ink},
  viewHint: {...type.caption, color: palette.inkFaint},
  chevron: {...type.title, color: palette.inkFaint},
  meta: {...type.caption, color: palette.inkFaint, marginBottom: space.md},
  grid: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm / 2},
  cell: {paddingHorizontal: space.sm / 2, paddingBottom: space.md},
}));
