'use client';

type GradientStop = { color: string; position: number };
type Background =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; angle: number; stops: GradientStop[]; animate: boolean; animationDuration: number };

type Props = { background: Background };

export function SceneBackground({ background }: Props) {
  if (background.type === 'solid') {
    return <div className="fixed inset-0 -z-10 pointer-events-none" style={{ backgroundColor: background.color }} />;
  }

  const stopsStr = background.stops.map((s) => s.color + ' ' + s.position + '%').join(', ');
  const gradient = 'linear-gradient(' + background.angle + 'deg, ' + stopsStr + ')';

  const size = background.animate ? '200% 200%' : '100% 100%';
  const anim = background.animate ? 'sceneShift ' + background.animationDuration + 's ease-in-out infinite' : 'none';

  return (
    <>
      <style>{`
        @keyframes sceneShift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ backgroundImage: gradient, backgroundSize: size, animation: anim }}
      />
    </>
  );
}