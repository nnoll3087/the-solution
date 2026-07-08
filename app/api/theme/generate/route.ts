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
    "shape": one of "circle" "bubble" "star" "sparkle" "leaf" "snowflake" "petal" "dot" "diamond" "custom",
    "customPath": only when shape is "custom" — an SVG path in a 24x24 viewBox drawing a simple filled silhouette that matches the theme (a spider for Spider-Man, a rocket for space, a T-rex for dinosaurs). Path commands and numbers only, one closed shape, under 500 characters. The silhouette must read clearly at 10-30px,
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
  "decorations": array of silhouettes at edges, each with:
    "type": "silhouette",
    "position": one of "top" "bottom",
    "shape": one of "mountains" "coral" "treeline" "cityscape" "hills" "waves" "clouds",
    "color": "#hex",
    "height": 60-200,
    "opacity": 0-1
}

DESIGN GUIDELINES:
- Kid-friendly prompts (rainbow, unicorn, dinosaur, space, ocean) should feel magical: lots of particles, glow, animated gradients
- Cozy prompts (autumn, minimalist, forest) should feel calm: fewer particles, gentler motion
- Ocean: bubbles rising + coral silhouettes + blue depths + subtle wave overlay
- Space: twinkling stars (twinkle direction, high count 40-60) + nebula gradient + optional radial glow
- Autumn: falling leaves (down direction, 15-25 count) + treeline silhouette + warm gradient
- Rainbow: colorful sparkles (twinkle) + arc gradient with 5+ color stops + high vibrancy
- All text colors MUST have strong contrast against background
- Always include at least 1 particle system unless truly minimalist
- When the prompt names a character, creature, or object with a recognizable silhouette, use a "custom" particle for it (spiders, dinosaurs, rockets, hearts, fish, lightning bolts). Mix it with a simpler second system (sparkles, dots) for depth
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
      max_tokens: 4096,
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