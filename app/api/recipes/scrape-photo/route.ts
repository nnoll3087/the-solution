import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { recordGeneration } from '@/lib/usage';

// Same client/model/usage-tracking pattern as /api/theme/generate and
// /api/meals/assistant — scrape spend counts against the same credit countdown.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You extract meal info from a photo for a family meal planner called "The Solution®." The photo could be a recipe card, a cookbook page, handwritten notes, a screenshot of a recipe, or a photo of the finished dish itself. Return ONLY valid JSON, no markdown fences, no explanation, in this exact shape:

{
  "title": "short dish name",
  "emoji": "one emoji that fits the dish",
  "notes": "plain text: the ingredient list (one per line) followed by a blank line and a short prep summary if visible"
}

If the photo is text (a recipe card, cookbook page, handwritten note, screenshot), transcribe the ingredients and any prep steps as written. If the photo is only a picture of a finished dish with no visible text, make your best-effort guess at the dish name and likely ingredients, and start notes with "Approximate — guessed from photo:" before the list. If the photo has nothing recipe-related in it at all, return {"title": "", "emoji": "", "notes": ""}.`;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl.trim() : '';
  if (!photoUrl) {
    return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photoUrl } },
            { type: 'text', text: 'Extract the meal info from this photo.' },
          ],
        },
      ],
    });

    await recordGeneration(message.usage.input_tokens, message.usage.output_tokens);

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const raw = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    let parsed: { title?: string; emoji?: string; notes?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
    }

    if (!parsed.title) {
      return NextResponse.json({ error: "Could not find anything recipe-related in that photo" }, { status: 422 });
    }

    return NextResponse.json({
      title: parsed.title,
      emoji: parsed.emoji || '',
      notes: parsed.notes || '',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Recipe photo scrape failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
