'use client';

const STARS = [1, 2, 3, 4, 5];

export function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}) {
  const sizeCls = size === 'sm' ? 'text-sm' : 'text-2xl';
  return (
    <div className="flex items-center gap-0.5">
      {STARS.map((s) => (
        <button
          key={s}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(value === s ? 0 : s)}
          className={sizeCls + ' leading-none ' + (onChange ? 'cursor-pointer hover:brightness-125' : 'cursor-default') + ' ' + (s <= value ? 'text-accent' : 'text-text-subtle')}
        >
          {s <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
