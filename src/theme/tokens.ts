export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32} as const;

export const radius = {chip: 10, card: 20, sheet: 28, pill: 999} as const;

export const type = {
  display: {fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.6},
  title: {fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.3},
  section: {fontSize: 15, lineHeight: 20, fontWeight: '600' as const},
  body: {fontSize: 15, lineHeight: 22, fontWeight: '400' as const},
  caption: {fontSize: 12.5, lineHeight: 17, fontWeight: '500' as const},
};

/** One shadow recipe, scaled by level — not a different shadow per component. */
export const shadow = (level: 1 | 2 | 3) => ({
  shadowColor: '#1B1637',
  shadowOpacity: [0.06, 0.1, 0.16][level - 1],
  shadowRadius: [10, 18, 28][level - 1],
  shadowOffset: {width: 0, height: [3, 8, 14][level - 1]},
  elevation: [2, 6, 12][level - 1],
});

export const motion = {
  press: {damping: 16, stiffness: 260, mass: 0.7},
  enter: {damping: 18, stiffness: 180, mass: 0.9},
  duration: {fast: 140, base: 240, slow: 420},
};
