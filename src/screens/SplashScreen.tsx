import React, {useEffect} from 'react';
import {Image, StatusBar, StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

const HOLD = 1700;
const FADE = 320;

/** The pale blue the artwork fades to at its edges, so no seam shows around it. */
const SPLASH_BG = '#F1F7FD';

/** How long the band of light takes to cross, and how long it waits before it starts. */
const GLARE_DELAY = 350;
const GLARE_TIME = 1150;
const GLARE_WIDTH = 150;

/**
 * The splash is a single piece of artwork shown full screen.
 *
 * It is drawn with resizeMode "cover" rather than "contain": phones are taller
 * than the 9:16 the artwork was drawn at, and letterboxing it would put bands
 * above and below the picture. Cover fills the screen and takes the trim off the
 * top and bottom instead, where the artwork has margin and nothing to lose.
 *
 * A soft band of light — a glare — sweeps across the artwork once while it is held.
 * The overall timing is unchanged: the app still waits HOLD + FADE before being
 * told to carry on, and the glare finishes well inside that.
 */
export const SplashScreen = ({onDone}: {onDone: () => void}) => {
  const out = useSharedValue(1);
  const glare = useSharedValue(0);
  const {width, height} = useWindowDimensions();

  useEffect(() => {
    out.value = withDelay(HOLD, withTiming(0, {duration: FADE}));
    glare.value = withDelay(GLARE_DELAY, withTiming(1, {duration: GLARE_TIME, easing: Easing.inOut(Easing.quad)}));
    const timer = setTimeout(onDone, HOLD + FADE);
    return () => clearTimeout(timer);
  }, [out, glare, onDone]);

  const fade = useAnimatedStyle(() => ({opacity: out.value}));
  const sweep = useAnimatedStyle(() => ({
    // From fully off the left edge to fully off the right, tilted, then hidden again.
    transform: [{translateX: -width * 0.6 + glare.value * width * 1.7}, {rotate: '18deg'}],
    opacity: glare.value > 0 && glare.value < 1 ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.root, fade]}>
      {/* The artwork is light, so the status bar icons have to be dark to stay legible. */}
      <StatusBar barStyle="dark-content" />
      <Image source={require('../../assets/splash.png')} style={styles.art} resizeMode="cover" />
      <Animated.View
        pointerEvents="none"
        style={[styles.glare, {height: height * 1.4, top: -height * 0.2}, sweep]}>
        <Svg width={GLARE_WIDTH} height="100%">
          <Defs>
            <LinearGradient id="glare" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.65" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={GLARE_WIDTH} height="100%" fill="url(#glare)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

// Not themed: the artwork is a fixed picture with a pale ground, and it is shown
// before the theme is even read.
const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: SPLASH_BG, overflow: 'hidden'},
  art: {width: '100%', height: '100%'},
  glare: {position: 'absolute', left: 0, width: GLARE_WIDTH},
});
