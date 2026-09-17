import React, {useEffect} from 'react';
import {Image, StatusBar, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';

const HOLD = 1700;
const FADE = 320;

/** The pale blue the artwork fades to at its edges, so no seam shows around it. */
const SPLASH_BG = '#F1F7FD';

/**
 * The splash is a single piece of artwork shown full screen.
 *
 * It is drawn with resizeMode "cover" rather than "contain": phones are taller
 * than the 9:16 the artwork was drawn at, and letterboxing it would put bands
 * above and below the picture. Cover fills the screen and takes the trim off the
 * top and bottom instead, where the artwork has margin and nothing to lose.
 *
 * The timing is unchanged from the animated splash it replaces — the app still
 * waits HOLD + FADE before being told to carry on.
 */
export const SplashScreen = ({onDone}: {onDone: () => void}) => {
  const out = useSharedValue(1);

  useEffect(() => {
    out.value = withDelay(HOLD, withTiming(0, {duration: FADE}));
    const timer = setTimeout(onDone, HOLD + FADE);
    return () => clearTimeout(timer);
  }, [out, onDone]);

  const fade = useAnimatedStyle(() => ({opacity: out.value}));

  return (
    <Animated.View style={[styles.root, fade]}>
      {/* The artwork is light, so the status bar icons have to be dark to stay legible. */}
      <StatusBar barStyle="dark-content" backgroundColor={SPLASH_BG} />
      <Image source={require('../../assets/splash.png')} style={styles.art} resizeMode="cover" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {...StyleSheet.absoluteFillObject, backgroundColor: SPLASH_BG},
  art: {width: '100%', height: '100%'},
});
