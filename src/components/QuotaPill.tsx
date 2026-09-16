import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {palette, radius, space, type} from '@/theme';
import {useApp} from '@/hooks/AppState';

export const QuotaPill = ({onPress}: {onPress: () => void}) => {
  const {premium, remaining} = useApp();
  const label = premium ? 'Premium' : `${remaining} free left`;
  const low = !premium && remaining <= 1;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={premium ? 'Premium is active' : `${remaining} free conversions left`}
        onPress={onPress}
        style={[
          styles.pill,
          premium && styles.premium,
          low && styles.low,
        ]}>
        <Text style={[styles.text, premium && styles.premiumText, low && styles.lowText]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  premium: {backgroundColor: '#FFF4DF', borderColor: '#FFD79A'},
  low: {backgroundColor: '#FFEBEC', borderColor: '#FFC7C9'},
  text: {...type.caption, color: palette.inkSoft},
  premiumText: {color: '#B46A00'},
  lowText: {color: palette.danger},
});
