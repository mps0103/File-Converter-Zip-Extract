import React from 'react';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {type InkName, useTheme} from '@/theme';
import type {ToolId} from '@/convert/catalog';

type Props = {
  toolId: ToolId;
  ink: InkName;
  size?: number;
};

const L = {
  stroke: '#FFFFFF',
  strokeWidth: 2.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

/**
 * The picture on a tool's tile: a white line drawing of what the tool does, on a
 * rounded tile in the tool's own colour. It is the same family as the folder icons on
 * the home screen — same tile, same stroke — so opening a folder does not change the
 * look of the app.
 */
export const ToolIcon = ({toolId, ink, size = 48}: Props) => {
  const {inkGradient} = useTheme();
  const [from, to] = inkGradient[ink];
  const id = `ti-${toolId}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width={48} height={48} rx={14} fill={`url(#${id})`} />
      {GLYPHS[GLYPH_OF[toolId] ?? 'doc']}
    </Svg>
  );
};

// ------------------------------------------------------------------ drawings

const GLYPHS: Record<string, React.ReactNode> = {
  // a page with ruled lines
  doc: (
    <>
      <Path d="M17 9h11l8 8v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" {...L} />
      <Path d="M28 9v8h8M19 25h10M19 31h7" {...L} />
    </>
  ),
  // a page with a T
  docText: (
    <>
      <Path d="M17 9h11l8 8v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" {...L} />
      <Path d="M28 9v8h8M19 24h10M24 24v11" {...L} />
    </>
  ),
  // rows and columns
  sheet: (
    <>
      <Rect x={10} y={11} width={28} height={26} rx={4} {...L} />
      <Path d="M10 19h28M10 27h28M21 19v18" {...L} />
    </>
  ),
  // a page with an arrow leaving it: one thing taken out of a PDF
  docOut: (
    <>
      <Path d="M17 9h11l8 8v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" {...L} />
      <Path d="M28 9v8h8M19 28h10m0 0-4-4m4 4-4 4" {...L} />
    </>
  ),
  // a sheet of grid with an arrow
  sheetOut: (
    <>
      <Rect x={10} y={11} width={28} height={26} rx={4} {...L} />
      <Path d="M10 19h28M18 19v18" {...L} />
      <Path d="M23 28h10m0 0-3-3m3 3-3 3" {...L} />
    </>
  ),
  // a presentation board
  slides: (
    <>
      <Rect x={9} y={11} width={30} height={19} rx={3} {...L} />
      <Path d="M24 30v6M17 37h14M16 22l5-5 4 4 4-6" {...L} />
    </>
  ),
  // camera corners with a scan line
  scan: (
    <>
      <Path d="M12 19v-5a2 2 0 0 1 2-2h5M29 12h5a2 2 0 0 1 2 2v5M36 29v5a2 2 0 0 1-2 2h-5M19 36h-5a2 2 0 0 1-2-2v-5" {...L} />
      <Path d="M15 24h18" {...L} />
    </>
  ),
  // a framed landscape
  picture: (
    <>
      <Rect x={9} y={11} width={30} height={26} rx={4} {...L} />
      <Circle cx={18} cy={20} r={3} {...L} />
      <Path d="M9 32l9-8 7 6 5-4 9 8" {...L} />
    </>
  ),
  // a landscape with an arrow taking it out
  pictureOut: (
    <>
      <Rect x={9} y={11} width={26} height={22} rx={4} {...L} />
      <Circle cx={17} cy={19} r={2.6} {...L} />
      <Path d="M9 29l8-7 6 5 4-3 8 6M34 40l8-8m0 0h-6m6 0v6" {...L} />
    </>
  ),
  // two arrows passing: convert one thing to another
  convert: (
    <>
      <Path d="M11 18h24m0 0-6-6m6 6-6 6" {...L} />
      <Path d="M37 31H13m0 0 6-6m-6 6 6 6" {...L} />
    </>
  ),
  // arrows pointing inward
  compress: (
    <>
      <Path d="M12 12l9 9m0-6v6h-6M36 12l-9 9m0-6v6h6M12 36l9-9m0 6v-6h-6M36 36l-9-9m0 6v-6h6" {...L} />
    </>
  ),
  // arrows pointing outward
  resize: (
    <>
      <Path d="M29 11h8v8M37 11l-10 10M19 37h-8v-8M11 37l10-10" {...L} />
    </>
  ),
  // a circular arrow
  rotate: (
    <>
      <Path d="M35 19a12 12 0 1 0 1.5 10" {...L} />
      <Path d="M36 10v9h-9" {...L} />
    </>
  ),
  // two paths coming together
  merge: (
    <>
      <Path d="M10 13h9l8 11M10 35h9l8-11M27 24h12m0 0-4-4m4 4-4 4" {...L} />
    </>
  ),
  // one path breaking in two
  split: (
    <>
      <Path d="M10 24h12M22 24l8-11h8M22 24l8 11h8M34 9l4 4-4 4M34 31l4 4-4 4" {...L} />
    </>
  ),
  // scissors
  trim: (
    <>
      <Circle cx={13} cy={14} r={3.5} {...L} />
      <Circle cx={13} cy={34} r={3.5} {...L} />
      <Path d="M16 16l22 16M16 32l22-16" {...L} />
    </>
  ),
  trash: (
    <>
      <Path d="M12 16h24M19 16v-4h10v4M15 16l1.5 20a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2L33 16M21 22v10M27 22v10" {...L} />
    </>
  ),
  hash: (
    <>
      <Path d="M20 12l-3 24M31 12l-3 24M12 20h25M11 28h25" {...L} />
    </>
  ),
  drop: (
    <>
      <Path d="M24 9c6 8 10 12 10 18a10 10 0 0 1-20 0c0-6 4-10 10-18Z" {...L} />
    </>
  ),
  lock: (
    <>
      <Rect x={13} y={22} width={22} height={16} rx={3} {...L} />
      <Path d="M18 22v-5a6 6 0 0 1 12 0v5M24 28v5" {...L} />
    </>
  ),
  unlock: (
    <>
      <Rect x={13} y={22} width={22} height={16} rx={3} {...L} />
      <Path d="M18 22v-5a6 6 0 0 1 11.5-2.4M24 28v5" {...L} />
    </>
  ),
  // a magnifier over text
  search: (
    <>
      <Circle cx={21} cy={21} r={9} {...L} />
      <Path d="M28 28l9 9M17 21h8M17 25h5" {...L} />
    </>
  ),
  // an eye
  eye: (
    <>
      <Path d="M7 24c4-7 9-11 17-11s13 4 17 11c-4 7-9 11-17 11S11 31 7 24Z" {...L} />
      <Circle cx={24} cy={24} r={4.5} {...L} />
    </>
  ),
  // a screen
  monitor: (
    <>
      <Rect x={8} y={11} width={32} height={22} rx={3} {...L} />
      <Path d="M18 38h12M24 33v5" {...L} />
    </>
  ),
  // a screen with a play triangle
  play: (
    <>
      <Rect x={8} y={12} width={32} height={24} rx={5} {...L} />
      <Path d="M21 18.5v11l9-5.5Z" stroke="#FFFFFF" strokeWidth={2.2} strokeLinejoin="round" fill="#FFFFFF" />
    </>
  ),
  // a music note
  note: (
    <>
      <Path d="M19 33V14l15-4v19" {...L} />
      <Circle cx={15} cy={33} r={4} {...L} />
      <Circle cx={30} cy={29} r={4} {...L} />
    </>
  ),
  // a video's sound: a note with a small play
  videoAudio: (
    <>
      <Path d="M22 31V13l12-3v17" {...L} />
      <Circle cx={18} cy={31} r={3.6} {...L} />
      <Circle cx={30} cy={27} r={3.6} {...L} />
      <Path d="M10 38h10m0 0-3-3m3 3-3 3" {...L} />
    </>
  ),
  // a speaker with waves
  volume: (
    <>
      <Path d="M10 20h6l8-6v20l-8-6h-6Z" {...L} />
      <Path d="M30 19a7 7 0 0 1 0 10M34 15a12 12 0 0 1 0 18" {...L} />
    </>
  ),
  // a speaker with a line through it
  mute: (
    <>
      <Path d="M9 20h6l8-6v20l-8-6H9Z" {...L} />
      <Path d="M29 19l11 11M40 19L29 30" {...L} />
    </>
  ),
  // a sound that grows
  fade: (
    <>
      <Path d="M11 30v-4M18 32v-10M25 34V16M32 36V12M39 38V9" {...L} />
    </>
  ),
  // a dial
  gauge: (
    <>
      <Path d="M10 33a15 15 0 1 1 28 0" {...L} />
      <Path d="M24 33l7-9" {...L} />
      <Circle cx={24} cy={33} r={2} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1} />
    </>
  ),
  // a bell
  bell: (
    <>
      <Path d="M24 10a9 9 0 0 1 9 9v6l3 5H12l3-5v-6a9 9 0 0 1 9-9ZM20 35a4 4 0 0 0 8 0" {...L} />
    </>
  ),
  // a crop frame
  crop: (
    <>
      <Path d="M15 8v25h25M8 15h25v25" {...L} />
    </>
  ),
  // two triangles mirrored
  flip: (
    <>
      <Path d="M24 8v32" {...L} />
      <Path d="M19 16L8 24l11 8Z" {...L} />
      <Path d="M29 16l11 8-11 8Z" {...L} />
    </>
  ),
  // half dark, half light
  grey: (
    <>
      <Circle cx={24} cy={24} r={13} {...L} />
      <Path d="M24 11a13 13 0 0 1 0 26Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.4} />
    </>
  ),
  // text in a scan frame
  ocr: (
    <>
      <Path d="M10 17v-4a2 2 0 0 1 2-2h4M32 11h4a2 2 0 0 1 2 2v4M38 31v4a2 2 0 0 1-2 2h-4M16 37h-4a2 2 0 0 1-2-2v-4" {...L} />
      <Path d="M18 19h12M24 19v11" {...L} />
    </>
  ),
  // an archive box
  box: (
    <>
      <Rect x={9} y={12} width={30} height={8} rx={2.5} {...L} />
      <Path d="M11 20v14a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V20M24 12v13M21 25h6" {...L} />
    </>
  ),
  // an open archive with an arrow leaving
  boxOut: (
    <>
      <Rect x={9} y={12} width={30} height={8} rx={2.5} {...L} />
      <Path d="M11 20v14a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V20M24 25v9m0 0-4-4m4 4 4-4" {...L} />
    </>
  ),
  // an information mark in a ring
  info: (
    <>
      <Circle cx={24} cy={24} r={14} {...L} />
      <Path d="M24 22v9" {...L} />
      <Circle cx={24} cy={16.5} r={1.4} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.2} />
    </>
  ),
};

/** Which drawing each tool wears. */
const GLYPH_OF: Partial<Record<ToolId, string>> = {
  'scan-to-pdf': 'scan',
  'image-to-pdf': 'picture',
  'pdf-to-word': 'docOut',
  'pdf-to-excel': 'sheetOut',
  'pdf-to-text': 'docText',
  'word-to-pdf': 'doc',
  'excel-to-pdf': 'sheet',
  'slides-to-pdf': 'slides',
  'text-to-pdf': 'docText',
  'csv-to-excel': 'sheet',
  'excel-to-csv': 'sheetOut',
  'word-to-text': 'docText',
  'extract-archive': 'boxOut',
  'make-archive': 'box',
  'view-pdf': 'eye',
  'pdf-merge': 'merge',
  'pdf-split': 'split',
  'pdf-compress': 'compress',
  'pdf-rotate': 'rotate',
  'pdf-delete-pages': 'trash',
  'pdf-page-numbers': 'hash',
  'pdf-watermark': 'drop',
  'pdf-protect': 'lock',
  'pdf-unlock': 'unlock',
  'pdf-to-images': 'picture',
  'pdf-extract-images': 'pictureOut',
  'pdf-searchable': 'search',
  'image-convert': 'convert',
  'image-resize': 'resize',
  'image-compress': 'compress',
  'image-crop': 'crop',
  'image-rotate': 'rotate',
  'image-flip': 'flip',
  'image-resolution': 'monitor',
  'image-grayscale': 'grey',
  'image-ocr': 'ocr',
  'video-convert': 'convert',
  'video-compress': 'compress',
  'video-to-audio': 'videoAudio',
  'video-merge': 'merge',
  'video-trim': 'trim',
  'video-rotate': 'rotate',
  'video-resolution': 'monitor',
  'video-mute': 'mute',
  'audio-convert': 'convert',
  'audio-compress': 'compress',
  'audio-trim': 'trim',
  'audio-merge': 'merge',
  ringtone: 'bell',
  'audio-volume': 'volume',
  'audio-fade': 'fade',
  'audio-bitrate': 'gauge',
  'file-info': 'info',
};
