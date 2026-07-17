'use client';

import { sanitizeSvg } from './sanitizeSvg';

type SilhouetteDecoration = {
  type: 'silhouette';
  position: 'top' | 'bottom';
  shape: 'mountains' | 'coral' | 'treeline' | 'cityscape' | 'hills' | 'waves' | 'clouds';
  color: string;
  height: number;
  opacity: number;
};

type CustomDecoration = {
  type: 'custom';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  svg: string;
  size: number;
  opacity: number;
};

type Decoration = SilhouetteDecoration | CustomDecoration;

const CORNER_STYLES: Record<CustomDecoration['position'], React.CSSProperties> = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
};

function CustomArt({ d }: { d: CustomDecoration }) {
  const safe = sanitizeSvg(d.svg);
  if (!safe) return null;
  const size = Math.min(Math.max(d.size || 200, 60), 600);
  return (
    <div
      style={{
        position: 'absolute',
        ...CORNER_STYLES[d.position] || CORNER_STYLES['top-right'],
        width: size,
        height: size,
        opacity: d.opacity,
        pointerEvents: 'none',
      }}
      // Sanitized through a strict whitelist in sanitizeSvg
      dangerouslySetInnerHTML={{ __html: safe.replace('<svg', '<svg width="' + size + '" height="' + size + '"') }}
    />
  );
}

type Props = { decorations: Decoration[] };

function shapePath(shape: SilhouetteDecoration['shape']): string {
  switch (shape) {
    case 'mountains':
      return 'M0 100 L0 60 L100 20 L200 55 L300 15 L400 40 L500 10 L600 45 L700 25 L800 50 L900 20 L1000 40 L1100 30 L1200 50 L1200 100 Z';
    case 'coral':
      return 'M0 100 L0 80 Q30 60 45 75 Q60 50 80 70 Q100 40 125 65 Q150 45 175 60 Q200 30 230 55 Q260 45 285 65 Q315 40 340 60 Q370 50 400 55 Q430 30 460 60 Q490 45 520 55 Q550 35 580 60 Q610 45 640 55 Q670 30 700 60 Q730 50 760 65 Q790 40 820 60 Q850 45 880 55 Q910 35 940 60 Q970 50 1000 55 Q1030 30 1060 60 Q1090 45 1120 65 Q1150 40 1180 55 Q1200 45 1200 60 L1200 100 Z';
    case 'treeline':
      return 'M0 100 L0 60 L20 55 L30 30 L40 55 L60 55 L70 20 L85 55 L100 55 L115 35 L130 55 L155 55 L170 25 L185 55 L210 55 L225 30 L245 55 L270 55 L285 40 L305 55 L330 55 L345 25 L365 55 L390 55 L405 35 L425 55 L450 55 L465 30 L485 55 L510 55 L525 20 L545 55 L570 55 L585 40 L605 55 L630 55 L645 25 L665 55 L690 55 L705 35 L725 55 L750 55 L765 30 L785 55 L810 55 L825 40 L845 55 L870 55 L885 25 L905 55 L930 55 L945 35 L965 55 L990 55 L1005 30 L1025 55 L1050 55 L1065 20 L1085 55 L1110 55 L1125 40 L1145 55 L1170 55 L1185 30 L1200 55 L1200 100 Z';
    case 'cityscape':
      return 'M0 100 L0 70 L40 70 L40 45 L80 45 L80 60 L120 60 L120 30 L160 30 L160 55 L200 55 L200 40 L240 40 L240 65 L280 65 L280 25 L320 25 L320 50 L360 50 L360 45 L400 45 L400 60 L440 60 L440 20 L480 20 L480 45 L520 45 L520 55 L560 55 L560 35 L600 35 L600 60 L640 60 L640 40 L680 40 L680 30 L720 30 L720 55 L760 55 L760 45 L800 45 L800 25 L840 25 L840 50 L880 50 L880 60 L920 60 L920 35 L960 35 L960 50 L1000 50 L1000 40 L1040 40 L1040 60 L1080 60 L1080 30 L1120 30 L1120 55 L1160 55 L1160 45 L1200 45 L1200 100 Z';
    case 'hills':
      return 'M0 100 L0 65 Q150 30 300 55 Q450 75 600 40 Q750 20 900 55 Q1050 75 1200 45 L1200 100 Z';
    case 'waves':
      return 'M0 100 L0 60 Q100 40 200 60 Q300 80 400 60 Q500 40 600 60 Q700 80 800 60 Q900 40 1000 60 Q1100 80 1200 60 L1200 100 Z';
    case 'clouds':
      return 'M0 0 L0 40 Q80 20 160 35 Q240 15 320 40 Q400 20 480 45 Q560 25 640 40 Q720 15 800 45 Q880 20 960 40 Q1040 25 1120 45 Q1180 30 1200 40 L1200 0 Z';
    default:
      return 'M0 100 L1200 100 L1200 100 L0 100 Z';
  }
}

export function SceneDecorations({ decorations }: Props) {
  if (decorations.length === 0) return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {decorations.map((d, idx) => {
        if (d.type === 'custom') return <CustomArt key={idx} d={d} />;
        const path = shapePath(d.shape);
        const style: React.CSSProperties = {
          position: 'absolute',
          left: 0,
          right: 0,
          width: '100%',
          height: d.height,
          opacity: d.opacity,
          pointerEvents: 'none',
        };
        if (d.position === 'top') {
          style.top = 0;
          style.transform = 'scaleY(-1)';
        } else {
          style.bottom = 0;
        }
        return (
          <svg
            key={idx}
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            style={style}
          >
            <path d={path} fill={d.color} />
          </svg>
        );
      })}
    </div>
  );
}