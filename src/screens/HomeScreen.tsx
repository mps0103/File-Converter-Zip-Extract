import React from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {FolderCard} from '@/components/FolderCard';
import {QuotaPill} from '@/components/QuotaPill';
import {BottomTabs} from '@/components/BottomTabs';
import {FOLDERS, toolsInFolder} from '@/convert/catalog';
import {makeStyles, radius, space, type} from '@/theme';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The home screen: folders, not a wall of tools. Each folder opens into its own list,
 * so the home screen stays the same length however many tools the app grows. There
 * are no ads here: they appear inside a folder, among its tools, once it is opened.
 */
export const HomeScreen = ({navigation}: Props) => {
  const styles = useStyles();

  // Two folders side by side on a phone, more when there is room — a rotated phone,
  // a foldable opened out, a tablet.
  const {width} = useWindowDimensions();
  const columns = Math.min(4, Math.max(2, Math.floor(Math.min(width, 900) / 190)));

  return (
    <Screen
      title="Convert a file"
      subtitle="Everything happens on your phone."
      right={<QuotaPill onPress={() => navigation.navigate('Premium')} />}
      footer={<BottomTabs active="Home" navigation={navigation} />}>
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

      <View style={styles.grid}>
        {FOLDERS.map((folder, i) => (
          <View key={folder.id} style={[styles.cell, {width: `${100 / columns}%`}]}>
            <FolderCard
              folder={folder}
              count={toolsInFolder(folder).length}
              index={i}
              onPress={f => navigation.navigate('Folder', {folderId: f.id})}
            />
          </View>
        ))}
      </View>

    </Screen>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
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
  grid: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm / 2},
  cell: {paddingHorizontal: space.sm / 2, paddingBottom: space.md},
}));
