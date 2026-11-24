import React from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {ToolCard} from '@/components/ToolCard';
import {QuotaPill} from '@/components/QuotaPill';
import {AdBanner} from '@/components/AdBanner';
import {FOLDERS, toolsInFolder} from '@/convert/catalog';
import {makeStyles, space} from '@/theme';
import {openTool} from '@/navigation/openTool';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Folder'>;

/**
 * One folder opened into its tools.
 *
 * The ad is the banner anchored to the bottom of the screen, outside the scrolling
 * grid. It used to sit between two rows of tiles, which is how an ad gets tapped by
 * someone aiming at a tool, and accidental clicks are what get an AdMob account
 * flagged. Out here it cannot be next to a tile; the grid's own bottom padding keeps
 * the last row clear of it too.
 */
export const FolderScreen = ({route, navigation}: Props) => {
  const styles = useStyles();
  const folder = FOLDERS.find(f => f.id === route.params.folderId) ?? FOLDERS[0];
  const tools = toolsInFolder(folder);

  // Two cards side by side on a phone, more when there is room.
  const {width} = useWindowDimensions();
  const columns = Math.min(4, Math.max(2, Math.floor(Math.min(width, 900) / 190)));

  return (
    <Screen
      title={folder.title}
      subtitle={folder.blurb}
      right={<QuotaPill onPress={() => navigation.navigate('Premium')} />}
      footer={<AdBanner />}>
      <View style={styles.grid}>
        {tools.map((tool, i) => (
          <View key={tool.id} style={[styles.cell, {width: `${100 / columns}%`}]}>
            <ToolCard tool={tool} index={i} onPress={t => openTool(navigation, t)} />
          </View>
        ))}
      </View>
    </Screen>
  );
};

const useStyles = makeStyles(() => StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.sm / 2},
  cell: {paddingHorizontal: space.sm / 2, paddingBottom: space.md},
}));
