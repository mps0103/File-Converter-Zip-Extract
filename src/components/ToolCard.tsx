import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {motion, palette, radius, shadow, space, type} from '@/theme';
import type {Tool} from '@/convert/catalog';
import {FileGlyph} from './FileGlyph';

type Props = {tool: Tool; index: number; onPress: (tool: Tool) => void};

export const ToolCard = ({tool, index, onPress}: Props) => {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{scale: withSpring(pressed.value ? 0.96 : 1, motion.press)}],
  }));

  return (
    // The entering animation and the press transform have to live on separate
    // views: a layout animation owns the transform of the view it runs on, so
    // putting both on one view makes reanimated warn that it will overwrite ours.
    <Animated.View
      entering={FadeInDown.delay(40 * index).springify().damping(18)}
      style={styles.shell}>
      <Animated.View style={[styles.shell, animated]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tool.title}. ${tool.from} to ${tool.to}.`}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        onPress={() => onPress(tool)}
        style={[styles.card, shadow(1)]}>
        <FileGlyph ink={tool.ink} label={tool.to.split(' ')[0]} size={40} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {tool.title}
          </Text>
          <Text style={styles.meta}>
            {tool.from} → {tool.to}
          </Text>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shell: {flex: 1},
  card: {
    flex: 1,
    minHeight: 138,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  text: {marginTop: space.md},
  title: {...type.section, fontSize: 16, color: palette.ink},
  meta: {...type.caption, color: palette.inkFaint, marginTop: 2},
});
