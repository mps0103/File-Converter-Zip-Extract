import React from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeOut} from 'react-native-reanimated';
import {LoadingBar} from '@/components/LoadingBar';
import {useApp} from '@/hooks/AppState';
import {makeStyles, space, type, useTheme} from '@/theme';

/**
 * Shown after the splash while the app gets its billing, ads, plan and history in
 * order, then faded away to reveal the dashboard.
 *
 * The bar is the count of start-up steps actually finished. It is not a timer: if
 * billing is slow the bar waits at the same place, and it leaves the moment the last
 * step is done.
 */
export const StartupScreen = () => {
  const styles = useStyles();
  const {dark} = useTheme();
  const {startup} = useApp();

  return (
    <Animated.View exiting={FadeOut.duration(280)} style={styles.root}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View style={styles.body}>
        <Text style={styles.title}>Getting things ready</Text>
        <View style={styles.bar}>
          <LoadingBar fraction={startup.done / startup.total} />
        </View>
        <Text style={styles.label}>{startup.label}</Text>
        <Text style={styles.count}>
          {startup.done} of {startup.total}
        </Text>
      </View>
    </Animated.View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {width: '100%', maxWidth: 360, paddingHorizontal: space.xl, alignItems: 'center'},
  title: {...type.title, color: palette.ink},
  bar: {width: '100%', marginTop: space.xl},
  label: {...type.section, color: palette.inkSoft, marginTop: space.lg},
  count: {...type.caption, color: palette.inkFaint, marginTop: 2},
}));
