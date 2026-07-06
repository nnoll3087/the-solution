'use client';

import { useMemo } from 'react';

type Particle = {
  shape: 'circle' | 'bubble' | 'star' | 'sparkle' | 'leaf' | 'snowflake' | 'petal' | 'dot' | 'diamond';
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorAlt?: string;
  opacityMin: number;
  opacityMax: number;
  direction: 'up' | 'down' | 'drift' | 'twinkle';
  speedMin: number;
  speedMax: number;
  wobble: boolean;
  glow: boolean;
};

type Props = { particles: Particle[] };

type Instance = {
  id: string;
  size: number;
  color: string;
  opacity: number;
  duration: number;
  delay: number;
  left: number;
  top: number;
  wobbleAmount: number;
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeInstances(system: Particle, seed: number): Instance[] {
  const rand = seededRandom(seed);
  const arr: Instance[] = [];
  for (let i = 0; i < system.count; i++) {
    const size = system.sizeMin + rand() * (system.sizeMax - system.sizeMin);
    const opacity = system.opacityMin + rand() * (system.opacityMax - system.opacityMin);
    const duration = system.speedMin + rand() * (system.speedMax - system.speedMin);
    const delay = -rand() * duration;
    const color = system.colorAlt && rand() > 0.5 ? system.colorAlt : system.color;
    arr.push({
      id: 'p-' + seed + '-' + i,
      size,
      color,
      opacity,
      duration,
      delay,
      left: rand() * 100,
      top: rand() * 100,
      wobbleAmount: 20 + rand() * 40,
    });
  }
  return arr;
}

function ParticleShape({ shape, size, color, glow }: { shape: Particle['shape']; size: number; color: string; glow: boolean }) {
  const filter = glow ? 'drop-shadow(0 0 ' + size / 2 + 'px ' + color + ')' : 'none';
  const commonStyle: React.CSSProperties = { width: size, height: size, filter };

  if (shape === 'circle' || shape === 'dot' || shape === 'bubble') {
    return (
      <div style={{
        ...commonStyle,
        background: shape === 'bubble' ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), ' + color + ')' : color,
        borderRadius: '50%',
        border: shape === 'bubble' ? '1px solid rgba(255,255,255,0.4)' : 'none',
      }} />
    );
  }

  if (shape === 'star') {
    return (
      <svg viewBox="0 0 24 24" style={commonStyle}>
        <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill={color} />
      </svg>
    );
  }

  if (shape === 'sparkle') {
    return (
      <svg viewBox="0 0 24 24" style={commonStyle}>
        <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={color} />
      </svg>
    );
  }

  if (shape === 'diamond') {
    return (
      <div style={{ ...commonStyle, background: color, transform: 'rotate(45deg)' }} />
    );
  }

  if (shape === 'leaf') {
    return (
      <svg viewBox="0 0 24 24" style={commonStyle}>
        <path d="M12 2 C6 8 4 14 12 22 C20 14 18 8 12 2 Z" fill={color} />
      </svg>
    );
  }

  if (shape === 'petal') {
    return (
      <svg viewBox="0 0 24 24" style={commonStyle}>
        <ellipse cx="12" cy="12" rx="5" ry="10" fill={color} />
      </svg>
    );
  }

  if (shape === 'snowflake') {
    return (
      <svg viewBox="0 0 24 24" style={commonStyle}>
        <g stroke={color} strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </g>
      </svg>
    );
  }

  return null;
}

export function SceneParticles({ particles }: Props) {
  const allInstances = useMemo(() => {
    return particles.map((system, idx) => ({
      system,
      instances: makeInstances(system, idx * 1000 + 1),
    }));
  }, [particles]);

  if (particles.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes riseUp {
          0% { transform: translateY(110vh) translateX(0); }
          100% { transform: translateY(-20vh) translateX(0); }
        }
        @keyframes fallDown {
          0% { transform: translateY(-20vh) translateX(0) rotate(0deg); }
          100% { transform: translateY(110vh) translateX(0) rotate(360deg); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(15px, -10px); }
          50% { transform: translate(-10px, 8px); }
          75% { transform: translate(8px, 12px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: var(--min-opacity); transform: scale(0.85); }
          50% { opacity: var(--max-opacity); transform: scale(1.15); }
        }
        @keyframes riseUpWobble {
          0% { transform: translateY(110vh) translateX(-15px); }
          50% { transform: translateY(45vh) translateX(15px); }
          100% { transform: translateY(-20vh) translateX(-15px); }
        }
        @keyframes fallDownWobble {
          0% { transform: translateY(-20vh) translateX(-20px) rotate(0deg); }
          50% { transform: translateY(45vh) translateX(20px) rotate(180deg); }
          100% { transform: translateY(110vh) translateX(-20px) rotate(360deg); }
        }
      `}</style>
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {allInstances.map(({ system, instances }) =>
          instances.map((p) => {
            let animation = 'none';
            const easing = 'linear';
            if (system.direction === 'up') animation = (system.wobble ? 'riseUpWobble ' : 'riseUp ') + p.duration + 's ' + easing + ' ' + p.delay + 's infinite';
            else if (system.direction === 'down') animation = (system.wobble ? 'fallDownWobble ' : 'fallDown ') + p.duration + 's ' + easing + ' ' + p.delay + 's infinite';
            else if (system.direction === 'drift') animation = 'drift ' + p.duration + 's ease-in-out ' + p.delay + 's infinite';
            else if (system.direction === 'twinkle') animation = 'twinkle ' + p.duration + 's ease-in-out ' + p.delay + 's infinite';

            const style: React.CSSProperties = {
              position: 'absolute',
              left: p.left + '%',
              top: p.top + '%',
              opacity: p.opacity,
              animation,
              ['--min-opacity' as string]: system.opacityMin,
              ['--max-opacity' as string]: system.opacityMax,
            };

            return (
              <div key={p.id} style={style}>
                <ParticleShape shape={system.shape} size={p.size} color={p.color} glow={system.glow} />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}