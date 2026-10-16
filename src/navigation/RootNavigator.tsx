import React, {useMemo, useState} from 'react';
import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {HomeScreen} from '@/screens/HomeScreen';
import {ConvertScreen} from '@/screens/ConvertScreen';
import {ResultScreen} from '@/screens/ResultScreen';
import {MakeArchiveScreen} from '@/screens/MakeArchiveScreen';
import {PremiumScreen} from '@/screens/PremiumScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {HistoryScreen} from '@/screens/HistoryScreen';
import {ViewerScreen} from '@/screens/ViewerScreen';
import {useTheme} from '@/theme';
import {useIncomingFile} from '@/hooks/useIncomingFile';
import {navigationRef} from './navigationRef';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // The container has to be ready before anything can be pushed onto the stack,
  // so an archive opened from another app waits for it rather than being dropped.
  const [ready, setReady] = useState(false);
  useIncomingFile(ready);
  const {palette, dark} = useTheme();

  // React Navigation paints the gap between screens during a push, so its theme
  // has to agree with the app's or a dark app flashes white on every transition.
  const navTheme = useMemo(
    () => {
      const base = dark ? DarkTheme : DefaultTheme;
      return {
        ...base,
        colors: {...base.colors, background: palette.canvas, card: palette.canvas, text: palette.ink},
      };
    },
    [dark, palette],
  );

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef} onReady={() => setReady(true)}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {backgroundColor: palette.canvas},
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Convert" component={ConvertScreen} />
        <Stack.Screen name="Result" component={ResultScreen} options={{animation: 'fade_from_bottom'}} />
        <Stack.Screen name="MakeArchive" component={MakeArchiveScreen} />
        <Stack.Screen name="Premium" component={PremiumScreen} options={{animation: 'slide_from_bottom'}} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Viewer" component={ViewerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
