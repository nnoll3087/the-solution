'use client';

import { useTheme } from '../ThemeProvider';
import { SceneBackground } from './SceneBackground';
import { SceneParticles } from './SceneParticles';
import { SceneOverlays } from './SceneOverlays';
import { SceneDecorations } from './SceneDecorations';

export function Scene() {
  const { theme } = useTheme();

  const bg = theme.background as Parameters<typeof SceneBackground>[0]['background'];
  const particles = (theme.particles || []) as Parameters<typeof SceneParticles>[0]['particles'];
  const overlays = (theme.overlays || []) as Parameters<typeof SceneOverlays>[0]['overlays'];
  const decorations = (theme.decorations || []) as Parameters<typeof SceneDecorations>[0]['decorations'];

  return (
    <>
      <SceneBackground background={bg} />
      <SceneDecorations decorations={decorations} />
      <SceneOverlays overlays={overlays} />
      <SceneParticles particles={particles} />
    </>
  );
}