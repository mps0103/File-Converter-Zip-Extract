import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {makeStyles, radius, useTheme, type InkName} from '@/theme';

type Props = {
  /** 0 to 1: how much of the work is really done. */
  fraction: number;
  ink?: InkName;
};

/**
 * A thin bar for work that has a count of steps rather than a stream of percentages.
 * It only ever shows the fraction it is handed; the easing is just the bar sliding to
 * each new value instead of jumping, and moves nothing on its own.
 */
export const LoadingBar = ({fraction, ink = 'pdf'}: Props) => {
  const styles = useStyles();
  const {inkGradient} = useTheme();
  const [from, to] = inkGradient[ink];
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(Math.min(1, Math.max(0, fraction)), {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [fraction, shown]);

  const fill = useAnimatedStyle(() => ({width: `${shown.value * 100}%`}));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(fraction * 100)}}
      style={styles.track}>
      <Animated.View style={[styles.fill, fill, {backgroundColor: to}]}>
        <View style={[styles.cap, {backgroundColor: from}]} />
      </Animated.View>
    </View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: radius.pill, overflow: 'hidden'},
  cap: {...StyleSheet.absoluteFillObject, opacity: 0.45},
}));
