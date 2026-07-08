'use client';

import { TaggedPerson } from '@/lib/events';

// Small colored dots showing who else an event is for (Solution-only tags)
export function TagDots({ alsoFor }: { alsoFor?: TaggedPerson[] }) {
  if (!alsoFor || alsoFor.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 flex-shrink-0">
      {alsoFor.map((p) => (
        <span
          key={p.displayName}
          title={'Also for ' + p.displayName}
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </span>
  );
}
