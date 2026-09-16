import React from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {motion, palette, radius, type} from '@/theme';

type Props = {
  label: string;
  colors: [string, string];
  onPress: () => void;
  disabled?: boolean;
  subtle?: boolean;
  style?: ViewStyle;
  height?: number;
};

export const GradientButton = ({
  label,
  colors,
  onPress,
  disabled,
  subtle,
  style,
  height = 54,
}: Props) => {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{scale: withSpring(pressed.value ? 0.965 : 1, motion.press)}],
    opacity: withSpring(pressed.value ? 0.92 : 1),
  }));

  if (subtle) {
    return (
      <Animated.View style={[animated, style]}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPressIn={() => (pressed.value = 1)}
          onPressOut={() => (pressed.value = 0)}
          onPress={onPress}
          style={[styles.subtle, {height, opacity: disabled ? 0.45 : 1}]}>
          <Text style={[type.section, {color: palette.ink}]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animated, style, {opacity: disabled ? 0.5 : 1}]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        onPress={onPress}
        style={[styles.wrap, {height}]}>
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="btn" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors[0]} />
                <Stop offset="1" stopColor={colors[1]} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" rx={radius.pill} fill="url(#btn)" />
          </Svg>
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSunk,
  },
  label: {...type.section, fontSize: 16, color: '#FFFFFF'},
});
