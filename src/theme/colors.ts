/**
 * Palette: "ink on paper, in colour".
 * A quiet paper canvas so the format inks stay loud. Every file type owns one ink,
 * and that ink follows the file through the whole flow: card, progress, result, share.
 */
export const palette = {
  canvas: '#F6F5FB',
  surface: '#FFFFFF',
  surfaceSunk: '#EFEDF7',
  ink: '#16142A',
  inkSoft: '#5A5670',
  inkFaint: '#9C98B0',
  hairline: '#E4E1F0',
  overlay: 'rgba(22,20,42,0.45)',

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
} as const;

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

export const premiumGradient: [string, string] = ['#FFC24B', '#FF6B6B'];
