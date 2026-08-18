// Local keyword lookup so recipe emoji suggestion never needs an API call.
// No imports — safe to use from client components directly, unlike lib/recipes.ts
// which pulls in lib/storage.ts (fs-backed, server-only).
const KEYWORD_EMOJI: [string, string][] = [
  ['taco', '🌮'], ['burrito', '🌯'], ['quesadilla', '🧀'], ['fajita', '🌯'],
  ['pizza', '🍕'], ['pasta', '🍝'], ['spaghetti', '🍝'], ['lasagna', '🍝'],
  ['noodle', '🍜'], ['ramen', '🍜'], ['dumpling', '🥟'],
  ['chicken', '🍗'], ['turkey', '🦃'], ['steak', '🥩'], ['beef', '🥩'],
  ['pork', '🥓'], ['bacon', '🥓'], ['ribs', '🍖'], ['bbq', '🍖'], ['grill', '🔥'],
  ['fish', '🐟'], ['salmon', '🐟'], ['shrimp', '🍤'], ['sushi', '🍣'],
  ['salad', '🥗'], ['soup', '🍲'], ['stew', '🍲'], ['chili', '🌶️'], ['curry', '🍛'],
  ['burger', '🍔'], ['sandwich', '🥪'], ['fries', '🍟'], ['rice', '🍚'],
  ['egg', '🍳'], ['pancake', '🥞'], ['waffle', '🧇'], ['oatmeal', '🥣'], ['cereal', '🥣'],
  ['bread', '🍞'], ['bagel', '🥯'], ['cake', '🍰'], ['cookie', '🍪'], ['pie', '🥧'],
  ['smoothie', '🥤'],
];

export function suggestEmoji(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, emoji] of KEYWORD_EMOJI) {
    if (lower.includes(keyword)) return emoji;
  }
  return '🍽️';
}
