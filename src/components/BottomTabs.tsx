import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import Svg, {Circle, Path} from 'react-native-svg';
import type {NavigationProp, ParamListBase} from '@react-navigation/native';
import {makeStyles, radius, space, useTheme} from '@/theme';

export type TabName = 'Home' | 'History' | 'Settings';

type Props = {
  active: TabName;
  navigation: NavigationProp<ParamListBase>;
};

const TABS: {name: TabName; label: string}[] = [
  {name: 'Home', label: 'Home'},
  {name: 'History', label: 'Recent files'},
  {name: 'Settings', label: 'Settings'},
];

/**
 * The highlight's spring: lively enough to be seen travelling, with a little overshoot
 * so it settles into place instead of stopping dead.
 */
const SPRING = {damping: 17, stiffness: 210, mass: 1} as const;

const BAR_PAD = space.sm;
const ITEM_HEIGHT = 60;

/**
 * Where the highlight was when the last tab screen went away.
 *
 * Every tab is a screen of its own, so the bar is rebuilt on each switch and would have
 * nothing to move from. Remembering the last tab here lets the new bar start its
 * highlight where the old one ended and spring across to the new tab, which reads as
 * one highlight sliding along one bar.
 */
let lastIndex = 0;

const Icon = ({name, color}: {name: TabName; color: string}) => {
  const common = {stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'Home' ? (
        <Path d="M4 11.5 12 4l8 7.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-7.5Z" {...common} />
      ) : name === 'History' ? (
        <>
          <Circle cx={12} cy={12} r={8} {...common} />
          <Path d="M12 7.5V12l3 2" {...common} />
        </>
      ) : (
        <>
          <Path d="M4 8h16M4 16h16" {...common} />
          <Circle cx={9} cy={8} r={2.4} fill={color} stroke={color} strokeWidth={1.4} />
          <Circle cx={15} cy={16} r={2.4} fill={color} stroke={color} strokeWidth={1.4} />
        </>
      )}
    </Svg>
  );
};

/**
 * The fixed bar at the bottom of the three main screens. Switching between them
 * replaces the screen rather than stacking another on top, so the back button always
 * leaves from Home and never walks back through every tab that was visited.
 */
export const BottomTabs = ({active, navigation}: Props) => {
  const styles = useStyles();
  const {palette} = useTheme();
  const activeIndex = TABS.findIndex(t => t.name === active);

  const [width, setWidth] = useState(0);
  const seg = width > 0 ? (width - BAR_PAD * 2) / TABS.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    if (seg === 0) return;
    // From where the last bar left it, to under this screen's tab.
    x.value = lastIndex * seg;
    x.value = withSpring(activeIndex * seg, SPRING);
    lastIndex = activeIndex;
  }, [activeIndex, seg, x]);

  const highlight = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));

  const go = (name: TabName) => {
    if (name === active) return;
    if (name === 'Home') {
      navigation.navigate('Home');
    } else if (active === 'Home') {
      navigation.navigate(name);
    } else {
      navigation.dispatch({type: 'REPLACE', payload: {name}});
    }
  };

  return (
    <View style={styles.bar} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {seg > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.highlightWrap, {width: seg}, highlight]}>
          <View style={styles.highlight} />
        </Animated.View>
      ) : null}
      {TABS.map(tab => {
        const on = tab.name === active;
        const color = on ? palette.ink : palette.inkFaint;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            accessibilityLabel={tab.label}
            onPress={() => go(tab.name)}
            style={styles.tab}>
            <Icon name={tab.name} color={color} />
            <Text style={[styles.label, {color}, on && styles.labelOn]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles(palette => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    paddingVertical: space.sm,
    paddingHorizontal: BAR_PAD,
  },
  // Sits behind the tabs, one tab wide, and is the part that moves.
  highlightWrap: {
    position: 'absolute',
    top: space.sm,
    left: BAR_PAD,
    height: ITEM_HEIGHT,
    padding: 3,
  },
  highlight: {
    flex: 1,
    borderRadius: radius.card,
    // The ink colour at low strength: a soft tint in light mode and in dark mode alike.
    backgroundColor: palette.ink,
    opacity: 0.12,
  },
  tab: {flex: 1, height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 3},
  label: {fontSize: 12, lineHeight: 16, fontWeight: '500'},
  labelOn: {fontWeight: '700'},
}));
