import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import {inkGradient, palette, type, type InkName} from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  percent: number;
  ink: InkName;
  size?: number;
};

/**
 * How long the arc takes to reach a new value. Anything that dismisses the ring
 * must wait at least this long after setting 100, or the work finishes first and
 * the arc is torn off screen part-drawn while the figure already reads 100.
 */
export const RING_SETTLE_MS = 420;

export const ProgressRing = ({percent, ink, size = 168}: Props) => {
  const [from, to] = inkGradient[ink];
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent / 100, {
      duration: RING_SETTLE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, progress]);

  useEffect(() => {
    // A slow sweep behind the ring, so the screen never looks frozen on a long file.
    spin.value = withRepeat(withTiming(1, {duration: 2600, easing: Easing.linear}), -1, false);
  }, [spin]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const sweep = useAnimatedStyle(() => ({
    transform: [{rotate: `${spin.value * 360}deg`}],
  }));

  return (
    <View style={{width: size, height: size}}>
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.surfaceSunk}
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.08} ${circumference * 0.92}`}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.surfaceSunk}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.percent}>{Math.round(percent)}</Text>
        <Text style={styles.unit}>percent</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
  percent: {...type.display, fontSize: 44, lineHeight: 48, color: palette.ink},
  unit: {...type.caption, color: palette.inkFaint},
});
