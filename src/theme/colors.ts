/**
 * Palette: "ink on paper, in colour".
 * A quiet canvas so the format inks stay loud. Every file type owns one ink, and
 * that ink follows the file through the whole flow: card, progress, result, share.
 *
 * Dark is not the light palette inverted. Paper flipped to black looks like a
 * mistake — the ink colours that read as confident on white glow on black, and the
 * shadows that lift a card off paper do nothing against it. So dark gets its own
 * canvas (a blue-black, not a grey), surfaces that separate by being *lighter*
 * rather than by shadow, and inks lifted in lightness and dropped in saturation
 * until each one carries the same weight against its own background as it does
 * against the other.
 */
export type Palette = {
  canvas: string;
  surface: string;
  surfaceSunk: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  hairline: string;
  overlay: string;
  /**
   * The canvas at 96%, for a progress overlay that covers the screen while a job
   * runs. Not `overlay`, which is a dark scrim meant to dim what is behind it:
   * this one is the screen's own colour, so the ring looks like it is sitting on
   * the page rather than on a sheet thrown over it.
   */
  canvasVeil: string;

  pdf: string;
  word: string;
  excel: string;
  slides: string;
  image: string;
  text: string;
  archive: string;

  success: string;
  danger: string;
  gold: string;
  goldDeep: string;
};

export const lightPalette: Palette = {
  canvas: '#F6F5FB',
  surface: '#FFFFFF',
  surfaceSunk: '#EFEDF7',
  ink: '#16142A',
  inkSoft: '#5A5670',
  inkFaint: '#9C98B0',
  hairline: '#E4E1F0',
  overlay: 'rgba(22,20,42,0.45)',
  canvasVeil: 'rgba(246,245,251,0.96)',

  pdf: '#E5484D',
  word: '#2B6CE5',
  excel: '#11A14A',
  slides: '#F2711C',
  image: '#8B5CF6',
  text: '#0EA5E9',
  archive: '#F5A524',

  success: '#11A14A',
  danger: '#E5484D',
  gold: '#FFB020',
  goldDeep: '#F97316',
};

export const darkPalette: Palette = {
  canvas: '#121020',
  surface: '#1C1930',
  surfaceSunk: '#151327',
  ink: '#F2F0FA',
  inkSoft: '#A9A4C2',
  inkFaint: '#726D8C',
  hairline: '#2C2845',
  overlay: 'rgba(5,4,12,0.62)',
  canvasVeil: 'rgba(18,16,32,0.96)',

  // Lifted and softened: the light inks are tuned for white and turn fluorescent
  // on a dark canvas.
  pdf: '#FF7A7E',
  word: '#6FA0FF',
  excel: '#49D184',
  slides: '#FFA55C',
  image: '#B49BFF',
  text: '#56C8F5',
  archive: '#FFC65C',

  success: '#49D184',
  danger: '#FF7A7E',
  gold: '#FFC24B',
  goldDeep: '#FF9345',
};

export type InkName = 'pdf' | 'word' | 'excel' | 'slides' | 'image' | 'text' | 'archive';

/** Two-stop gradient per ink, used on icons, progress rings and CTAs. */
export const inkGradient: Record<InkName, [string, string]> = {
  pdf: ['#FF6B6E', '#C81E25'],
  word: ['#4F8DFF', '#1746A2'],
  excel: ['#3ED17F', '#0B7A38'],
  slides: ['#FFA14A', '#D2540A'],
  image: ['#A78BFA', '#6D28D9'],
  text: ['#38BDF8', '#0369A1'],
  archive: ['#FFC95C', '#C97A05'],
};

/**
 * The same gradients, opened up for a dark canvas. A gradient that ends in a deep
 * shade disappears into the background there, so the dark end is raised to roughly
 * where the light end sits on paper.
 */
export const darkInkGradient: Record<InkName, [string, string]> = {
  pdf: ['#FF9093', '#D8383D'],
  word: ['#7FAEFF', '#2E63C8'],
  excel: ['#5FDD96', '#18924D'],
  slides: ['#FFB578', '#DE6A1E'],
  image: ['#C0ABFF', '#7C45E8'],
  text: ['#6ED3F7', '#1686C0'],
  archive: ['#FFD37C', '#DC911A'],
};

export const premiumGradient: [string, string] = ['#FFC24B', '#FF6B6B'];

/**
 * The light palette under its old name.
 *
 * Styles are built per theme now and read their colours from the palette handed to
 * them, so almost nothing imports this. It stays for the few places that are drawn
 * before a theme can exist — the splash, and the native window behind it.
 */
export const palette = lightPalette;
