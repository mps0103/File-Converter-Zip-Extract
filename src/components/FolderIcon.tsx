import React from 'react';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {type InkName, useTheme} from '@/theme';

type Props = {
  /** Which folder's picture to draw: a Folder's id. */
  folderId: string;
  ink: InkName;
  size?: number;
};

const STROKE = {
  stroke: '#FFFFFF',
  strokeWidth: 2.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

/**
 * The picture on a home-screen folder: a white line drawing of what is inside, on a
 * rounded tile in the folder's own colour.
 *
 * Drawn rather than imported, like the file glyphs, so every folder shares one tile
 * and one stroke and only the drawing and the colour change.
 */
export const FolderIcon = ({folderId, ink, size = 52}: Props) => {
  const {inkGradient} = useTheme();
  const [from, to] = inkGradient[ink];
  const id = `fi-${folderId}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width={48} height={48} rx={14} fill={`url(#${id})`} />
      {draw(folderId)}
    </Svg>
  );
};

const draw = (folderId: string) => {
  switch (folderId) {
    case 'pdf':
      // A page with a folded corner and ruled lines.
      return (
        <>
          <Path d="M17 9h11l8 8v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" {...STROKE} />
          <Path d="M28 9v8h8" {...STROKE} />
          <Path d="M19 25h10M19 31h7" {...STROKE} />
        </>
      );
    case 'to-from-pdf':
      // One thing becoming another: two arrows passing each other.
      return (
        <>
          <Path d="M11 18h24m0 0-6-6m6 6-6 6" {...STROKE} />
          <Path d="M37 31H13m0 0 6-6m-6 6 6 6" {...STROKE} />
        </>
      );
    case 'pictures':
      // A framed landscape: a sun over two hills.
      return (
        <>
          <Rect x={9} y={11} width={30} height={26} rx={4} {...STROKE} />
          <Circle cx={18} cy={20} r={3} {...STROKE} />
          <Path d="M9 32l9-8 7 6 5-4 9 8" {...STROKE} />
        </>
      );
    case 'video':
      // A screen with a play triangle.
      return (
        <>
          <Rect x={8} y={12} width={32} height={24} rx={5} {...STROKE} />
          <Path d="M21 18.5v11l9-5.5Z" stroke="#FFFFFF" strokeWidth={2.2} strokeLinejoin="round" fill="#FFFFFF" />
        </>
      );
    case 'audio':
      // A pair of joined notes.
      return (
        <>
          <Path d="M19 33V14l15-4v19" {...STROKE} />
          <Circle cx={15} cy={33} r={4} {...STROKE} />
          <Circle cx={30} cy={29} r={4} {...STROKE} />
        </>
      );
    case 'documents':
      // A sheet of rows and columns.
      return (
        <>
          <Rect x={10} y={11} width={28} height={26} rx={4} {...STROKE} />
          <Path d="M10 19h28M10 27h28M21 19v18" {...STROKE} />
        </>
      );
    case 'archives':
      // A box with a zip down the lid.
      return (
        <>
          <Rect x={9} y={12} width={30} height={8} rx={2.5} {...STROKE} />
          <Path d="M11 20v14a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V20" {...STROKE} />
          <Path d="M24 12v13M21 25h6" {...STROKE} />
        </>
      );
    default:
      // An information mark in a ring.
      return (
        <>
          <Circle cx={24} cy={24} r={14} {...STROKE} />
          <Path d="M24 22v9" {...STROKE} />
          <Circle cx={24} cy={16.5} r={1.4} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.2} />
        </>
      );
  }
};
