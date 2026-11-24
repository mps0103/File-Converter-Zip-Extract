import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {makeStyles, motion, radius, shadow, space, type} from '@/theme';
import type {Folder} from '@/convert/catalog';
import {FolderIcon} from './FolderIcon';

type Props = {folder: Folder; count: number; index: number; onPress: (folder: Folder) => void};

/**
 * A folder on the home screen. It is a ToolCard in everything but its contents — the
 * same card and the same press spring — so a folder and a tool read as one family.
 * Its picture is a drawn icon of what is inside rather than the paper-sheet glyph
 * the tools use, so a folder is not mistaken for a file.
 */
export const FolderCard = ({folder, count, index, onPress}: Props) => {
  const styles = useStyles();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{scale: withSpring(pressed.value ? 0.96 : 1, motion.press)}],
  }));

  return (
    // Entering animation and press transform live on separate views, as in ToolCard.
    <Animated.View entering={FadeInDown.delay(40 * index).springify().damping(18)} style={styles.shell}>
      <Animated.View style={[styles.shell, animated]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${folder.title}, ${count} tools. ${folder.blurb}.`}
          onPressIn={() => (pressed.value = 1)}
          onPressOut={() => (pressed.value = 0)}
          onPress={() => onPress(folder)}
          style={[styles.card, shadow(1)]}>
          <View style={styles.top}>
            <FolderIcon folderId={folder.id} ink={folder.ink} size={52} />
            <Text style={styles.count}>{count}</Text>
          </View>
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>
              {folder.title}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {folder.blurb}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  shell: {flex: 1},
  card: {
    flex: 1,
    minHeight: 160,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  count: {...type.title, color: palette.inkFaint},
  text: {marginTop: space.md},
  title: {...type.section, fontSize: 16, color: palette.ink},
  meta: {...type.caption, color: palette.inkFaint, marginTop: 2},
}));
