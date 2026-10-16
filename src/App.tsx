import './polyfills';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppStateProvider} from '@/hooks/AppState';
import {RootNavigator} from '@/navigation/RootNavigator';
import {SplashScreen} from '@/screens/SplashScreen';
import {ThemeProvider, makeStyles} from '@/theme';

/**
 * Everything below the theme.
 *
 * It is a component of its own rather than part of App because it reads the theme,
 * and App is what provides it — a component cannot consume a context it renders.
 */
const Themed = () => {
  const styles = useStyles();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <View style={styles.root}>
      <RootNavigator />
      {!splashDone ? <SplashScreen onDone={() => setSplashDone(true)} /> : null}
    </View>
  );
};

const App = () => (
  // No colour on the outermost view: it is drawn before the theme is known, and a
  // pale canvas here would flash white for a frame on a dark phone. The window
  // behind it is already the right colour, set by the native theme.
  <GestureHandlerRootView style={styles.outer}>
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <Themed />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({outer: {flex: 1}});

const useStyles = makeStyles(palette =>
  StyleSheet.create({
    root: {flex: 1, backgroundColor: palette.canvas},
  }),
);

export default App;
