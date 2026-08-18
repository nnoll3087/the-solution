import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getRecipes } from '@/lib/recipes';
import { MEAL_TYPE_LABELS } from '@/lib/mealTypes';
import { recordGeneration } from '@/lib/usage';

// Same client, model, and usage tracking as /api/theme/generate — meal-assistant
// spend counts against the same credit countdown the theme prompt shows.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false;
  const { role, content } = m as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim().length > 0;
}

async function buildSystemPrompt(): Promise<string> {
  const recipes = await getRecipes();

  if (recipes.length === 0) {
    return `You are a friendly meal-planning assistant for a family calendar app called "The Solution®." The family hasn't logged any meals yet, so you have no history to draw on. Offer concrete, appealing meal ideas based on what they ask for (cuisine, ingredients, time of day, mood). Keep answers conversational and concise — a sentence or two per suggestion, not a full recipe. Don't claim to know their preferences; just be helpful. Reply in plain text only — no markdown (no **bold**, no bullet lists with -/*, no headers). The chat UI displays raw text.`;
  }

  const lines = recipes.map((r) => {
    const types = r.mealTypes.map((t) => MEAL_TYPE_LABELS[t]).join(', ');
    const ratings: string[] = [];
    if (r.kidsRating) ratings.push('kids ' + r.kidsRating + '/5');
    if (r.parentsRating) ratings.push('parents ' + r.parentsRating + '/5');
    const parts = [types];
    if (ratings.length > 0) parts.push(ratings.join(', '));
    if (r.notes) parts.push('notes: ' + r.notes);
    return '- ' + r.title + ' (' + parts.join(' — ') + ')';
  });

  return `You are a friendly meal-planning assistant for a family calendar app called "The Solution®." You help the family decide what to cook by drawing on meals they've already made and rated, and by suggesting new ideas.

Here is everything currently in their meal collection (name, which meal type(s) it's used for, ratings out of 5 from kids and parents where given, and notes if any):

${lines.join('\n')}

When suggesting something:
- Prefer highly-rated meals from the list when they fit what's being asked — mention them by their exact title so they're recognizable
- Low-rated or unrated meals in the list are fair game too if nothing better fits, just don't oversell them
- Feel free to suggest brand-new ideas that aren't in the list, especially if nothing there fits the mood
- Keep answers conversational and concise — a sentence or two per suggestion, not a full recipe
- If asked something unrelated to meals, gently steer back to meal planning
- Reply in plain text only — no markdown (no **bold**, no bullet lists with -/*, no headers). The chat UI displays raw text`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages.filter(isChatMessage) : null;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'messages[] is required' }, { status: 400 });
  }

  try {
    const system = await buildSystemPrompt();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: messages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    });

    await recordGeneration(message.usage.input_tokens, message.usage.output_tokens);

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    return NextResponse.json({ reply: textBlock.text.trim() });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Meal assistant failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
