import React from 'react';
import Svg, {Defs, LinearGradient, Path, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {inkGradient, type InkName} from '@/theme';

type Props = {
  ink: InkName;
  label: string;
  size?: number;
};

/**
 * A sheet of paper with a folded corner and a colour band carrying the format name.
 * Drawn rather than imported so every format shares one silhouette and only the ink changes.
 */
export const FileGlyph = ({ink, label, size = 44}: Props) => {
  const [from, to] = inkGradient[ink];
  const id = `g-${ink}`;
  const w = size;
  const h = size * 1.22;

  return (
    <Svg width={w} height={h} viewBox="0 0 44 54">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      {/* page */}
      <Path
        d="M6 3.5C6 1.57 7.57 0 9.5 0H28l16 15.4V50.5c0 1.93-1.57 3.5-3.5 3.5h-31A3.5 3.5 0 0 1 6 50.5V3.5Z"
        fill="#FFFFFF"
        stroke="#DEDAEE"
        strokeWidth={1.2}
      />
      {/* folded corner */}
      <Path d="M28 0l16 15.4H31.5A3.5 3.5 0 0 1 28 11.9V0Z" fill={`url(#${id})`} opacity={0.35} />
      {/* ruled lines */}
      <Rect x={12} y={21} width={20} height={2} rx={1} fill="#E7E4F2" />
      <Rect x={12} y={27} width={14} height={2} rx={1} fill="#E7E4F2" />
      {/* format band */}
      <Rect x={0} y={32} width={34} height={15} rx={4} fill={`url(#${id})`} />
      <SvgText
        x={17}
        y={43}
        fill="#FFFFFF"
        fontSize={label.length > 4 ? 7.5 : 9}
        fontWeight="700"
        textAnchor="middle">
        {label.toUpperCase()}
      </SvgText>
    </Svg>
  );
};
