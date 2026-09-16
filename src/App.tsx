import './polyfills';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppStateProvider} from '@/hooks/AppState';
import {RootNavigator} from '@/navigation/RootNavigator';
import {SplashScreen} from '@/screens/SplashScreen';
import {palette} from '@/theme';

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStateProvider>
          <View style={styles.root}>
            <RootNavigator />
            {!splashDone ? <SplashScreen onDone={() => setSplashDone(true)} /> : null}
          </View>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: palette.canvas},
});

export default App;
