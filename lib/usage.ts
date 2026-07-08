import { readStore, writeStore } from './storage';

// Tracks estimated Anthropic API spend from theme generations. The API does not
// expose account credit balance, so the user enters their balance from the
// console and this counts down from it. Estimates cover this app's usage only.

// claude-sonnet-4-6 pricing, USD per million tokens
const INPUT_PER_MTOK = 3;
const OUTPUT_PER_MTOK = 15;

export type UsageData = {
  balanceUsd: number | null; // user-entered, from console.anthropic.com
  balanceSetAt: string | null;
  spentSinceBalanceSetUsd: number;
  totalSpentUsd: number;
  generationCount: number;
  lastGeneration?: {
    at: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
};

const EMPTY: UsageData = {
  balanceUsd: null,
  balanceSetAt: null,
  spentSinceBalanceSetUsd: 0,
  totalSpentUsd: 0,
  generationCount: 0,
};

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_PER_MTOK + outputTokens * OUTPUT_PER_MTOK) / 1_000_000;
}

export async function getUsage(): Promise<UsageData> {
  return readStore('usage', EMPTY);
}

export async function recordGeneration(inputTokens: number, outputTokens: number) {
  const usage = await getUsage();
  const costUsd = estimateCostUsd(inputTokens, outputTokens);
  await writeStore('usage', {
    ...usage,
    spentSinceBalanceSetUsd: usage.spentSinceBalanceSetUsd + costUsd,
    totalSpentUsd: usage.totalSpentUsd + costUsd,
    generationCount: usage.generationCount + 1,
    lastGeneration: {
      at: new Date().toISOString(),
      inputTokens,
      outputTokens,
      costUsd,
    },
  });
}

export async function setBalance(balanceUsd: number) {
  const usage = await getUsage();
  await writeStore('usage', {
    ...usage,
    balanceUsd,
    balanceSetAt: new Date().toISOString(),
    spentSinceBalanceSetUsd: 0,
  });
}

export function remainingUsd(usage: UsageData): number | null {
  if (usage.balanceUsd === null) return null;
  return usage.balanceUsd - usage.spentSinceBalanceSetUsd;
}
