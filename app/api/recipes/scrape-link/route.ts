import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { recordGeneration } from '@/lib/usage';

// Same client/model/usage-tracking pattern as /api/theme/generate and
// /api/meals/assistant — scrape spend counts against the same credit countdown.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You extract meal info from scraped recipe webpage text for a family meal planner called "The Solution®." Return ONLY valid JSON, no markdown fences, no explanation, in this exact shape:

{
  "title": "short dish name",
  "emoji": "one emoji that fits the dish",
  "notes": "plain text: the ingredient list (one per line, with quantities as written on the page) followed by a blank line and a short prep summary if the page clearly has one"
}

The input is raw text scraped from a webpage, so it will contain noise (navigation, ads, comments, unrelated site chrome). Ignore anything that is not the recipe itself. If you cannot find a real recipe in the text (e.g. the page is not a recipe, or scraping failed to capture the recipe content), return {"title": "", "emoji": "", "notes": ""} instead of guessing.`;

// Strips scripts/styles/tags to plain-ish text with no HTML-parsing dependency —
// intentionally low-fidelity; Claude is good at pulling signal out of noisy text.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL' }, { status: 400 });
  }

  let pageText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json({ error: 'That page returned an error (' + res.status + ')' }, { status: 502 });
    }
    const html = await res.text();
    pageText = htmlToPlainText(html.slice(0, 500_000)).slice(0, 15_000);
    if (!pageText) {
      return NextResponse.json({ error: 'Could not read any content from that page' }, { status: 502 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'That page took too long to load' : 'Could not fetch that page';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Scraped page text:\n\n' + pageText }],
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
      return NextResponse.json({ error: "Could not find a recipe on that page" }, { status: 422 });
    }

    return NextResponse.json({
      title: parsed.title,
      emoji: parsed.emoji || '',
      notes: parsed.notes || '',
      sourceLabel: parsedUrl.hostname.replace(/^www\./, ''),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Recipe link scrape failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
