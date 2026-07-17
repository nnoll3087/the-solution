import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { saveTheme } from '@/lib/theme';
import { recordGeneration } from '@/lib/usage';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a creative theme designer for a family calendar dashboard called "The Solution®." Your goal is to create magical, immersive themes that elicit wonder, especially for children.

Given a theme prompt, return a JSON scene spec. Return ONLY valid JSON. No markdown fences, no explanation.

The spec has these fields:

{
  "name": "short human-readable theme name",
  "mode": "light" or "dark",
  "colors": {
    "background": "#hex",
    "surface": "#hex, card background, visibly different from background",
    "surfaceElevated": "#hex, modal background",
    "border": "#hex",
    "text": "#hex, must have 4.5:1 contrast against background",
    "textMuted": "#hex",
    "textSubtle": "#hex",
    "accent": "#hex",
    "accentHover": "#hex",
    "success": "#hex",
    "warning": "#hex, amber/caution tone that fits the theme, readable against surface",
    "danger": "#hex"
  },
  "background": {
    "type": "gradient" or "solid",
    "angle": number in degrees (only if gradient, 0 = bottom to top),
    "stops": array of objects like { "color": "#hex", "position": 0 to 100 } (only if gradient, at least 2),
    "animate": boolean (only if gradient),
    "animationDuration": seconds (20-90 recommended)
  },
  "particles": array of particle systems, each with:
    "shape": one of "circle" "bubble" "star" "sparkle" "leaf" "snowflake" "petal" "dot" "diamond" "custom" "emoji",
    "emoji": only when shape is "emoji" — one emoji character that nails the theme (spider for a spider theme, T-rex for dinosaurs, rocket for space, crown for princess, soccer ball for sports). Emoji render crisp and instantly recognizable; prefer this over "custom" for any creature or object that has a good emoji,
    "customSvg": only when shape is "custom" — a complete small SVG: <svg viewBox="0 0 24 24">...</svg> using path/circle/ellipse/rect/line/polygon/g elements with fill, stroke, stroke-width, opacity attributes. Multi-element drawings with strokes look far better than one filled path (a spider = ellipse body + circle head + 8 stroked leg lines). Under 1500 characters. Must read clearly at 10-30px,
    "count": 5-60,
    "sizeMin": 2-8,
    "sizeMax": 8-40,
    "color": "#hex",
    "colorAlt": optional "#hex",
    "opacityMin": 0-1,
    "opacityMax": 0-1,
    "direction": one of "up" "down" "drift" "twinkle",
    "speedMin": 10-60,
    "speedMax": 10-60,
    "wobble": boolean,
    "glow": boolean,
  "overlays": array of atmospheric overlays, each with:
    "type": one of "radial-glow" "vignette" "wave-band",
    "position": one of "top" "bottom" "center",
    "color": "#hex",
    "opacity": 0-1,
    "size": optional pixels,
  "decorations": array of scene art, each is ONE of:
    {"type": "silhouette", "position": "top"|"bottom", "shape": "mountains"|"coral"|"treeline"|"cityscape"|"hills"|"waves"|"clouds", "color": "#hex", "height": 60-200, "opacity": 0-1}
    {"type": "custom", "position": "top-left"|"top-right"|"bottom-left"|"bottom-right", "svg": "<svg viewBox=\\"0 0 100 100\\">...</svg>", "size": 150-400, "opacity": 0.15-0.5}
    Custom decorations are large corner art and the single biggest wow lever. Line art with strokes works beautifully: a spiderweb (radial spokes from the corner + concentric arc rings, stroke only, no fill), tree branches, a moon with craters, planet with rings, castle turret. Use 2-8 elements, stroke-width 1-2, subtle opacity so content stays readable
}

DESIGN GUIDELINES:
- GO FOR WOW. This is a family dashboard and the theme should make kids gasp. Every theme gets:
  at least 2 particle systems (one theme-specific + one atmospheric like sparkles/dots), an
  animated gradient background, and at least 1 decoration. Character/creature themes should also
  get a custom corner decoration
- THEME-SPECIFIC RECIPES (adapt the pattern to whatever is asked):
  - Spider theme: emoji spider particles falling with wobble + a large stroked spiderweb custom
    decoration in a top corner + dark red/blue gradient + tiny dot particles drifting
  - Dinosaur: emoji T-rex + leaf particles falling + treeline silhouette + jungle green gradient
  - Space: emoji rocket drifting + 50 twinkling stars + a ringed-planet custom corner decoration + nebula gradient
  - Princess: emoji crown + sparkle particles twinkling with glow + a castle-turret corner decoration + pink/lavender gradient
  - Ocean: bubbles rising + emoji fish drifting + coral silhouette + deep blue gradient + wave overlay
  - Autumn: falling leaf particles + treeline silhouette + warm amber gradient
- Kid-friendly prompts should feel magical: lots of particles, glow, animation. Cozy prompts (minimalist, forest): fewer, gentler
- When the theme names a character, creature, or object: use its emoji as a particle system if a
  fitting emoji exists, otherwise draw it with "custom" + customSvg. Never settle for generic
  circles when something specific fits
- All text colors MUST have strong contrast against background; overlays and decorations stay
  subtle (low opacity) so the calendar stays readable
- Prefer animated gradients for immersive themes
- Be bold and distinct. No timid themes.
- All colors are full 6-digit hex codes with # prefix`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Theme prompt: ' + prompt.trim() }],
    });

    await recordGeneration(message.usage.input_tokens, message.usage.output_tokens);

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let raw = textBlock.text.trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    let theme;
    try {
      theme = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 });
    }

    if (!theme.colors || !theme.name) {
      return NextResponse.json({ error: 'AI theme missing required fields', theme }, { status: 500 });
    }

    if (!theme.colors.warning) theme.colors.warning = '#f59e0b';
    if (!theme.particles) theme.particles = [];
    if (!theme.overlays) theme.overlays = [];
    if (!theme.decorations) theme.decorations = [];
    if (!theme.background) theme.background = { type: 'solid', color: theme.colors.background };

    await saveTheme(theme);
    return NextResponse.json({ theme });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Theme generation failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}