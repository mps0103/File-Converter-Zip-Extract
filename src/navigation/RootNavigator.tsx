import React, {useState} from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {HomeScreen} from '@/screens/HomeScreen';
import {ConvertScreen} from '@/screens/ConvertScreen';
import {ResultScreen} from '@/screens/ResultScreen';
import {MakeArchiveScreen} from '@/screens/MakeArchiveScreen';
import {PremiumScreen} from '@/screens/PremiumScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {HistoryScreen} from '@/screens/HistoryScreen';
import {ViewerScreen} from '@/screens/ViewerScreen';
import {palette} from '@/theme';
import {useIncomingFile} from '@/hooks/useIncomingFile';
import {navigationRef} from './navigationRef';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {...DefaultTheme.colors, background: palette.canvas, card: palette.canvas, text: palette.ink},
};

export const RootNavigator = () => {
  // The container has to be ready before anything can be pushed onto the stack,
  // so an archive opened from another app waits for it rather than being dropped.
  const [ready, setReady] = useState(false);
  useIncomingFile(ready);

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
