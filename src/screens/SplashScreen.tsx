import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {motion, palette, type} from '@/theme';

const HOLD = 1700;
const FADE = 320;

/**
 * One orchestrated moment: two sheets slide together and the arrow snaps between them.
 * After that the app is quiet.
 */
export const SplashScreen = ({onDone}: {onDone: () => void}) => {
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const arrow = useSharedValue(0);
  const word = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    left.value = withSpring(1, motion.enter);
    right.value = withDelay(90, withSpring(1, motion.enter));
    arrow.value = withDelay(
      320,
      withSequence(
        withSpring(1.18, {damping: 9, stiffness: 220}),
        withSpring(1, motion.press),
      ),
    );
    word.value = withDelay(420, withTiming(1, {duration: 420, easing: Easing.out(Easing.cubic)}));
    out.value = withDelay(HOLD, withTiming(0, {duration: FADE}));
    const timer = setTimeout(onDone, HOLD + FADE);
    return () => clearTimeout(timer);
  }, [left, right, arrow, word, out, onDone]);

  const fade = useAnimatedStyle(() => ({opacity: out.value}));
  const leftStyle = useAnimatedStyle(() => ({
    opacity: left.value,
    transform: [{translateX: (1 - left.value) * -34}, {rotate: `${(1 - left.value) * -12}deg`}],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: right.value,
    transform: [{translateX: (1 - right.value) * 34}, {rotate: `${(1 - right.value) * 12}deg`}],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: arrow.value > 0 ? 1 : 0,
    transform: [{scale: arrow.value}],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{translateY: (1 - word.value) * 10}],
  }));

  return (
    <Animated.View style={[styles.root, fade]}>
      <StatusBar barStyle="light-content" backgroundColor="#241E52" />
      <View style={styles.mark}>
        <Animated.View style={leftStyle}>
          <Sheet from="#FF6B6E" to="#C81E25" />
        </Animated.View>
        <Animated.View style={[styles.arrow, arrowStyle]}>
          <Svg width={34} height={34} viewBox="0 0 24 24">
            <Path
              d="M4 12h13M12.5 6.5 18.5 12l-6 5.5"
              stroke="#FFFFFF"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Animated.View style={rightStyle}>
          <Sheet from="#4F8DFF" to="#1746A2" />
        </Animated.View>
      </View>

      <Animated.View style={wordStyle}>
        <Text style={styles.name}>File Converter & Zip Extract</Text>
        <Text style={styles.tagline}>Convert anything, offline</Text>
      </Animated.View>
    </Animated.View>
  );
};

const Sheet = ({from, to}: {from: string; to: string}) => {
  const id = `s${from.slice(1)}`;
  return (
    <Svg width={58} height={72} viewBox="0 0 44 54">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Path
        d="M6 3.5C6 1.57 7.57 0 9.5 0H28l16 15.4V50.5c0 1.93-1.57 3.5-3.5 3.5h-31A3.5 3.5 0 0 1 6 50.5V3.5Z"
        fill="#FFFFFF"
      />
      <Path d="M28 0l16 15.4H31.5A3.5 3.5 0 0 1 28 11.9V0Z" fill={`url(#${id})`} opacity={0.4} />
      <Rect x={0} y={31} width={34} height={16} rx={4} fill={`url(#${id})`} />
    </Svg>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#241E52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {flexDirection: 'row', alignItems: 'center', marginBottom: 28},
  arrow: {marginHorizontal: 10},
  // The name wraps to two lines on a narrow phone, so it needs room at the sides.
  name: {...type.display, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 24},
  tagline: {...type.body, color: 'rgba(255,255,255,0.66)', textAlign: 'center', marginTop: 4},
});
