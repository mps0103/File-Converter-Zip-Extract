import React, {useEffect} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {motion, palette, radius, shadow, space, type} from '@/theme';
import {GradientButton} from './GradientButton';

export type DialogAction = {
  label: string;
  onPress: () => void;
  colors?: [string, string];
  subtle?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: React.ReactNode;
  actions: DialogAction[];
  onDismiss?: () => void;
};

export const AppDialog = ({visible, title, message, icon, actions, onDismiss}: Props) => {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = visible ? 1 : 0;
  }, [visible, enter]);

  const card = useAnimatedStyle(() => ({
    opacity: withTiming(enter.value, {duration: motion.duration.fast}),
    transform: [
      {scale: withSpring(enter.value ? 1 : 0.92, motion.enter)},
      {translateY: withSpring(enter.value ? 0 : 18, motion.enter)},
    ],
  }));

  const scrim = useAnimatedStyle(() => ({
    opacity: withTiming(enter.value, {duration: motion.duration.base}),
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessible={false} />
        <Animated.View style={[styles.card, shadow(3), card]}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {actions.map(a => (
              <GradientButton
                key={a.label}
                label={a.label}
                subtle={a.subtle}
                colors={a.colors ?? ['#6D5BE0', '#3B2F9E']}
                onPress={a.onPress}
                height={48}
                style={styles.action}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: palette.surface,
    borderRadius: radius.sheet,
    padding: space.xl,
  },
  icon: {alignItems: 'center', marginBottom: space.md},
  title: {...type.title, color: palette.ink, textAlign: 'center'},
  message: {
    ...type.body,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.sm,
  },
  actions: {marginTop: space.xl, gap: space.sm},
  action: {width: '100%'},
});
