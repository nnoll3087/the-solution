'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Photo-frame screensaver: after IDLE_MS without interaction on the home page,
// fades into a fullscreen Ken Burns slideshow of the family photos in Blob.
// Horizontal swipes move between photos; any tap, key, or scroll returns to
// the calendar. Never activates when no photos are uploaded.

type Photo = { id: string; url: string; uploadedAt: string };
type Slide = { photo: Photo; seq: number };
type NextUp = { person: string; title: string; time: string };

const IDLE_MS = 15 * 60 * 1000;
const PHOTO_MS = 20 * 1000;
const EXIT_FADE_MS = 500;
const SWIPE_MIN_PX = 60;
const POOL_REFRESH_MS = 15 * 60 * 1000;

function samePhotoSet(a: Photo[], b: Photo[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((p) => p.id));
  return b.every((p) => ids.has(p.id));
}

// Shuffle biased toward recent uploads: weight decays with age in days
function weightedShuffle(photos: Photo[]): number[] {
  const now = Date.now();
  const entries = photos.map((p, i) => {
    const days = Math.max(0, (now - new Date(p.uploadedAt).getTime()) / 86400000);
    return { i, w: 1 / Math.sqrt(days + 1) };
  });
  const order: number[] = [];
  while (entries.length > 0) {
    const total = entries.reduce((sum, e) => sum + e.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < entries.length - 1; idx++) {
      r -= entries[idx].w;
      if (r <= 0) break;
    }
    order.push(entries[idx].i);
    entries.splice(idx, 1);
  }
  return order;
}

// One photo layer. Keyed by slide.seq so when a slide moves from the "current"
// (fading in) role to the "previous" (fully visible, underneath) role, the DOM
// node survives and its Ken Burns animation keeps running instead of restarting.
function Layer({ slide, fadingIn }: { slide: Slide; fadingIn: boolean }) {
  const [on, setOn] = useState(!fadingIn);
  useEffect(() => {
    if (!fadingIn) return;
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, [fadingIn]);
  return (
    <div className={'absolute inset-0 transition-opacity duration-[1500ms] ease-linear ' + (on ? 'opacity-100' : 'opacity-0')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.photo.url}
        alt=""
        draggable={false}
        className={'w-full h-full object-cover ' + (slide.seq % 2 === 0 ? 'kenburns-a' : 'kenburns-b')}
      />
    </div>
  );
}

export type SlideshowHandle = { activate: () => void };

export const Slideshow = forwardRef<SlideshowHandle, { hideTrigger?: boolean }>(function Slideshow({ hideTrigger }, ref) {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Slide | null>(null);
  const [previous, setPrevious] = useState<Slide | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [nextUp, setNextUp] = useState<NextUp | null>(null);
  // Bumped to re-arm the idle timer after a no-photos check, and to restart
  // the auto-advance interval after a manual swipe
  const [armTick, setArmTick] = useState(0);
  const [intervalKey, setIntervalKey] = useState(0);

  const photosRef = useRef<Photo[]>([]);
  const orderRef = useRef<number[]>([]);
  const posRef = useRef(0);
  const seqRef = useRef(0);
  const currentRef = useRef<Slide | null>(null);
  const exitingRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({ activate: () => tryActivate() }));

  function reshuffleForward() {
    const lastShown = orderRef.current[orderRef.current.length - 1];
    let order = weightedShuffle(photosRef.current);
    if (order.length > 1 && order[0] === lastShown) order = [...order.slice(1), order[0]];
    orderRef.current = order;
  }

  function showSlide(index: number) {
    const seq = ++seqRef.current;
    const slide = { photo: photosRef.current[orderRef.current[index]], seq };
    setPrevious(currentRef.current);
    currentRef.current = slide;
    setCurrent(slide);
  }

  function advance(dir: 1 | -1) {
    if (photosRef.current.length < 2) return;
    let pos = posRef.current + dir;
    if (pos >= orderRef.current.length) {
      reshuffleForward();
      pos = 0;
    } else if (pos < 0) {
      pos = orderRef.current.length - 1;
    }
    posRef.current = pos;
    showSlide(pos);
  }

  async function tryActivate() {
    try {
      const res = await fetch('/api/photos');
      const data = await res.json();
      const photos: Photo[] = data.photos || [];
      if (photos.length === 0) {
        setArmTick((t) => t + 1); // no photos: quietly re-arm the idle timer
        return;
      }
      photosRef.current = photos;
      orderRef.current = weightedShuffle(photos);
      posRef.current = 0;
      currentRef.current = null;
      setPrevious(null);
      showSlide(0);
      setNow(new Date());
      setActive(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } catch {
      setArmTick((t) => t + 1);
    }
  }

  function exit() {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setVisible(false);
    setTimeout(() => {
      setActive(false);
      setCurrent(null);
      setPrevious(null);
      setNextUp(null);
      currentRef.current = null;
      exitingRef.current = false;
    }, EXIT_FADE_MS);
  }

  // Background photo-pool refresh: the slideshow can run uninterrupted for a
  // very long time once active (nothing re-fetches until the next idle-timer
  // activation), so a kiosk left alone overnight would otherwise loop the
  // same frozen set indefinitely and never pick up new uploads. Polling here
  // — active or not — means new photos fold into a running session directly
  // instead of waiting on a full page reload.
  useEffect(() => {
    async function refreshPool() {
      try {
        const res = await fetch('/api/photos');
        const data = await res.json();
        const photos: Photo[] = data.photos || [];
        if (samePhotoSet(photos, photosRef.current)) return;
        photosRef.current = photos;
        if (!active) return;
        if (photos.length === 0) {
          exit();
          return;
        }
        orderRef.current = weightedShuffle(photos);
        posRef.current = 0;
        showSlide(0);
      } catch {
        // Leave the current pool in place; try again next interval.
      }
    }
    const iv = setInterval(refreshPool, POOL_REFRESH_MS);
    return () => clearInterval(iv);
  }, [active]);

  // Idle timer: only armed while the slideshow is not showing
  useEffect(() => {
    if (active) return;
    let timer: ReturnType<typeof setTimeout>;
    let lastReset = 0;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(tryActivate, IDLE_MS);
    };
    const onActivity = () => {
      const n = Date.now();
      if (n - lastReset < 1000) return; // throttle pointermove churn
      lastReset = n;
      reset();
    };
    const evs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      evs.forEach((e) => window.removeEventListener(e, onActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, armTick]);

  // Auto-advance; intervalKey restarts the 20s clock after a manual swipe
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => advance(1), PHOTO_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalKey]);

  // Keys and scroll exit immediately (pointer taps are handled on the overlay,
  // where they're distinguished from swipes)
  useEffect(() => {
    if (!active) return;
    const onExit = () => exit();
    window.addEventListener('keydown', onExit);
    window.addEventListener('wheel', onExit, { passive: true });
    return () => {
      window.removeEventListener('keydown', onExit);
      window.removeEventListener('wheel', onExit);
    };
  }, [active]);

  // Clock (initial value is set at activation time)
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(iv);
  }, [active]);

  // Next-up ribbon: earliest timed event in the next 12 hours
  useEffect(() => {
    if (!active) return;
    function loadNext() {
      const start = new Date();
      const end = new Date(start.getTime() + 12 * 3600000);
      fetch('/api/events?timeMin=' + encodeURIComponent(start.toISOString()) + '&timeMax=' + encodeURIComponent(end.toISOString()))
        .then((r) => r.json())
        .then((data) => {
          type EventLite = { title: string; displayName: string; start: string; allDay: boolean; custody?: unknown };
          const events: EventLite[] = data.events || [];
          const upcoming = events
            .filter((e) => !e.allDay && !e.custody && new Date(e.start).getTime() > Date.now())
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
          setNextUp(
            upcoming
              ? {
                  person: upcoming.displayName,
                  title: upcoming.title,
                  time: new Date(upcoming.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                }
              : null
          );
        })
        .catch(() => {});
    }
    loadNext();
    const iv = setInterval(loadNext, 5 * 60000);
    return () => clearInterval(iv);
  }, [active]);

  // Preload the next photo so the crossfade never pops in half-loaded
  useEffect(() => {
    if (!current || orderRef.current.length < 2) return;
    const next = photosRef.current[orderRef.current[(posRef.current + 1) % orderRef.current.length]];
    if (next) {
      const img = new Image();
      img.src = next.url;
    }
  }, [current]);

  // Manual entry: quietly no-ops with zero photos via the same activation path.
  if (!active) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={tryActivate}
        title="Start the photo slideshow"
        className="fixed bottom-4 right-[4.25rem] z-40 w-11 h-11 flex items-center justify-center rounded-full bg-surface/80 backdrop-blur border border-border-themed text-text-muted hover:text-text hover:bg-surface-elevated transition text-lg"
      >
        🖼️
      </button>
    );
  }

  const layers = [previous, current].filter((s): s is Slide => s !== null);

  return (
    <div
      className={
        'fixed inset-0 z-50 bg-black overflow-hidden cursor-none select-none touch-none transition-opacity ' +
        (visible ? 'opacity-100 duration-[2000ms]' : 'opacity-0 duration-500')
      }
      onPointerDown={(e) => {
        pointerRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerCancel={() => {
        pointerRef.current = null;
      }}
      onPointerUp={(e) => {
        const startPt = pointerRef.current;
        pointerRef.current = null;
        if (!startPt) return;
        const dx = e.clientX - startPt.x;
        const dy = e.clientY - startPt.y;
        if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
          advance(dx < 0 ? 1 : -1);
          setIntervalKey((k) => k + 1);
        } else {
          exit();
        }
      }}
    >
      {layers.map((s) => (
        <Layer key={s.seq} slide={s} fadingIn={s === current} />
      ))}

      {now && (
        <div
          className="absolute top-8 right-10 text-right pointer-events-none"
          style={{ color: 'var(--theme-text)', textShadow: '0 1px 10px rgba(0,0,0,0.65)' }}
        >
          <div className="text-5xl font-semibold tabular-nums">
            {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="text-lg opacity-85">
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      )}

      {nextUp && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none px-4">
          <div className="max-w-full truncate px-5 py-2.5 rounded-full bg-surface/70 backdrop-blur border border-border-themed text-text text-base shadow-lg">
            <span className="font-semibold">{nextUp.person}</span>: {nextUp.title} at {nextUp.time}
          </div>
        </div>
      )}
    </div>
  );
});
