import './polyfills';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppStateProvider, useApp} from '@/hooks/AppState';
import {RootNavigator} from '@/navigation/RootNavigator';
import {SplashScreen} from '@/screens/SplashScreen';
import {StartupScreen} from '@/screens/StartupScreen';
import {ThemeProvider, makeStyles} from '@/theme';

/**
 * Everything below the theme.
 *
 * It is a component of its own rather than part of App because it reads the theme,
 * and App is what provides it — a component cannot consume a context it renders.
 */
const Themed = ({splashDone, onSplashDone}: {splashDone: boolean; onSplashDone: () => void}) => {
  const styles = useStyles();
  const {ready} = useApp();

  return (
    <View style={styles.root}>
      <RootNavigator />
      {/* After the splash, until start-up has really finished. */}
      {splashDone && !ready ? <StartupScreen /> : null}
      {!splashDone ? <SplashScreen onDone={onSplashDone} /> : null}
    </View>
  );
};

const App = () => {
  // Start-up work waits for the splash to end, so the loading bar after it shows the
  // real length of that work rather than whatever was left over.
  const [splashDone, setSplashDone] = useState(false);
  return (
  // No colour on the outermost view: it is drawn before the theme is known, and a
  // pale canvas here would flash white for a frame on a dark phone. The window
  // behind it is already the right colour, set by the native theme.
  <GestureHandlerRootView style={styles.outer}>
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider start={splashDone}>
          <Themed splashDone={splashDone} onSplashDone={() => setSplashDone(true)} />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({outer: {flex: 1}});

const useStyles = makeStyles(palette =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: palette.canvas},
  }),
);

export default App;
