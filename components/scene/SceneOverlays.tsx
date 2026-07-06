'use client';

type Overlay = {
  type: 'radial-glow' | 'vignette' | 'wave-band';
  position: 'top' | 'bottom' | 'center';
  color: string;
  opacity: number;
  size?: number;
};

type Props = { overlays: Overlay[] };

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function positionStyles(position: 'top' | 'bottom' | 'center'): React.CSSProperties {
  if (position === 'top') return { top: 0, left: 0, right: 0 };
  if (position === 'bottom') return { bottom: 0, left: 0, right: 0 };
  return { inset: 0 };
}

export function SceneOverlays({ overlays }: Props) {
  if (overlays.length === 0) return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {overlays.map((o, idx) => {
        const rgba = hexToRgba(o.color, o.opacity);

        if (o.type === 'radial-glow') {
          const size = o.size || 500;
          const gradient = 'radial-gradient(circle at 50% 50%, ' + rgba + ' 0%, transparent 70%)';
          const posY = o.position === 'top' ? -size / 3 : o.position === 'bottom' ? 'calc(100% - ' + (size * 2 / 3) + 'px)' : '50%';
          const transform = o.position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)';
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: '50%',
                top: posY,
                width: size,
                height: size,
                backgroundImage: gradient,
                transform,
                pointerEvents: 'none',
              }}
            />
          );
        }

        if (o.type === 'vignette') {
          const gradient = 'radial-gradient(ellipse at center, transparent 40%, ' + rgba + ' 100%)';
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: gradient,
                pointerEvents: 'none',
              }}
            />
          );
        }

        if (o.type === 'wave-band') {
          const size = o.size || 120;
          const gradientDir = o.position === 'top' ? 'to bottom' : 'to top';
          const gradient = 'linear-gradient(' + gradientDir + ', ' + rgba + ', transparent)';
          const style: React.CSSProperties = {
            position: 'absolute',
            left: 0,
            right: 0,
            height: size,
            backgroundImage: gradient,
            pointerEvents: 'none',
          };
          if (o.position === 'top') style.top = 0;
          else if (o.position === 'bottom') style.bottom = 0;
          else { style.top = '50%'; style.transform = 'translateY(-50%)'; }
          return <div key={idx} style={style} />;
        }

        return null;
      })}
    </div>
  );
}