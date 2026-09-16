import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '@/components/Screen';
import {AdBanner} from '@/components/AdBanner';
import {AppDialog} from '@/components/AppDialog';
import {FileGlyph} from '@/components/FileGlyph';
import {toolById} from '@/convert/catalog';
import {previewKindFor} from '@/convert/preview';
import {FileBridge} from '@/native/FileBridge';
import {useApp} from '@/hooks/AppState';
import {palette, radius, shadow, space, type, type InkName} from '@/theme';
import type {HistoryItem} from '@/services/history';
import type {RootStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

/** Colours a viewed row by its format, the same way the tool cards are coloured. */
const inkForExtension = (ext: string): InkName => {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'excel';
    case 'ppt':
    case 'pptx':
      return 'slides';
    case 'zip':
    case '7z':
    case 'rar':
    case 'tar':
    case 'gz':
    case 'tgz':
    case 'bz2':
    case 'xz':
      return 'archive';
    default:
      return 'text';
  }
};

export const HistoryScreen = ({navigation}: Props) => {
  const {history, wipeHistory, forgetHistoryItem} = useApp();
  const [confirm, setConfirm] = useState(false);
  // The row a long press picked out, held until the sheet is answered.
  const [pendingRemove, setPendingRemove] = useState<HistoryItem | null>(null);

  /**
   * Anything the app can read opens in its own viewer. Handing it to another app
   * was the old behaviour and meant a converted file left the app to be read,
   * which is odd now that the app has a viewer of its own. Formats the viewer
   * does not know — an image, say — still go out to whatever handles them.
   */
  const open = useCallback(
    (item: HistoryItem) => {
      const file = {uri: item.uri, name: item.name, mime: item.mime, size: 0};
      if (previewKindFor(file) !== 'unsupported') {
        navigation.navigate('Viewer', {file});
        return;
      }
      FileBridge.openFile(item.uri, item.mime);
    },
    [navigation],
  );

  return (
    <Screen
      title="Recent files"
      subtitle="Files this app made, and files you opened in the viewer."
      footer={<AdBanner />}>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <FileGlyph ink="text" label="new" size={54} />
          <Text style={styles.emptyTitle}>Nothing converted yet</Text>
          <Text style={styles.emptyHint}>
            Convert something, or open a file in the viewer, and it will show up here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.list}>
            {history.map((item, i) => {
              const tool = item.toolId ? toolById(item.toolId) : null;
              const ext = (item.name.match(/\.([^.]+)$/)?.[1] ?? 'file').toUpperCase();
              const ink = tool ? tool.ink : inkForExtension(ext);
              const label = tool ? tool.to.split(' ')[0] : ext;
              const meta = tool
                ? `${tool.title} · ${new Date(item.at).toLocaleDateString()}`
                : `Viewed · ${new Date(item.at).toLocaleDateString()}`;
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 40).springify().damping(18)}
                  style={[styles.row, shadow(1)]}>
                  <Pressable
                    // Long press anywhere on the row offers to forget it. The whole
                    // row is the target rather than a visible button, so the list
                    // stays a list of files instead of a list of controls.
                    onLongPress={() => setPendingRemove(item)}
                    delayLongPress={400}
                    style={styles.rowTouch}>
                  <FileGlyph ink={ink} label={label} size={30} />
                  <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta}>{meta}</Text>
                  </View>
                  </Pressable>
                  <Pressable onPress={() => open(item)} hitSlop={10}>
                    <Text style={styles.open}>Open</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          <Pressable onPress={() => setConfirm(true)} style={styles.clear}>
            <Text style={styles.clearText}>Clear this list</Text>
          </Pressable>
        </>
      )}

      <AppDialog
        visible={!!pendingRemove}
        title="Remove from this list?"
        message={
          pendingRemove
            ? `"${pendingRemove.name}" stays in your Downloads folder. Only the entry here is removed.`
            : ''
        }
        actions={[
          {
            label: 'Remove from here',
            colors: ['#FF6B6E', '#C81E25'],
            onPress: () => {
              if (pendingRemove) forgetHistoryItem(pendingRemove.id);
              setPendingRemove(null);
            },
          },
          {label: 'Keep it', subtle: true, onPress: () => setPendingRemove(null)},
        ]}
        onDismiss={() => setPendingRemove(null)}
      />

      <AppDialog
        visible={confirm}
        title="Clear the list?"
        message="This only clears the list inside the app. The files stay in your Downloads folder."
        actions={[
          {
            label: 'Clear list',
            colors: ['#FF6B6E', '#C81E25'],
            onPress: () => {
              wipeHistory();
              setConfirm(false);
            },
          },
          {label: 'Keep it', subtle: true, onPress: () => setConfirm(false)},
        ]}
        onDismiss={() => setConfirm(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  empty: {alignItems: 'center', paddingTop: space.xxl * 2, gap: space.md},
  emptyTitle: {...type.title, color: palette.ink},
  emptyHint: {...type.caption, color: palette.inkFaint, textAlign: 'center'},
  list: {gap: space.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.md,
  },
  // Wraps the glyph and the labels so the long press covers the row without
  // swallowing the Open button beside it.
  rowTouch: {flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1},
  text: {flex: 1},
  name: {...type.section, color: palette.ink},
  meta: {...type.caption, color: palette.inkFaint},
  open: {...type.caption, color: palette.word},
  clear: {paddingVertical: space.xl, alignItems: 'center'},
  clearText: {...type.caption, color: palette.danger},
});
