'use client';

import { useEffect, useRef, useState } from 'react';
import { OnScreenKeyboard } from './OnScreenKeyboard';
import { EditableField } from './typeIntoField';

// Global on-screen keyboard for the touchscreen kiosk. Mounted once in the
// root layout so it also covers /login. Shows when any eligible text field
// gains focus.
//
// Auto-enabled for coarse-pointer devices at desktop width (the kiosk profile;
// phones are coarse too but their native keyboard already pops up, and doubling
// up would be worse). Force on any device with ?osk=1 in the URL once
// (persisted to localStorage; ?osk=0 clears the override).

const OSK_FLAG = 'solution-osk';
const KEYBOARD_PAD_PX = 300; // approximate tray height, reserved below content while open
const HIDE_GRACE_MS = 120;

function eligibleField(target: EventTarget | null): EditableField | null {
  if (target instanceof HTMLTextAreaElement) return target;
  if (target instanceof HTMLInputElement) {
    const ok = ['text', 'password', 'email', 'search', 'url', 'number', 'tel'];
    if (ok.includes(target.type) && !target.readOnly && !target.disabled) return target;
  }
  return null;
}

// Nearest ancestor that actually scrolls (a drawer's own overflow-y-auto, or
// the document itself), so the keyboard-clearance buffer lands on the right
// element instead of always growing document.body.
function findScrollParent(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

export function KeyboardProvider() {
  const [enabled, setEnabled] = useState(false);
  const [field, setField] = useState<EditableField | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // setTimeout, not requestAnimationFrame: rAF never fires while a tab is
    // hidden, which would leave the keyboard disabled until something repaints
    const id = setTimeout(() => {
      let forced = false;
      try {
        const param = new URLSearchParams(window.location.search).get('osk');
        if (param === '1') localStorage.setItem(OSK_FLAG, '1');
        if (param === '0') localStorage.removeItem(OSK_FLAG);
        forced = localStorage.getItem(OSK_FLAG) === '1';
      } catch {}
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const wide = window.innerWidth >= 1024;
      setEnabled(forced || (coarse && wide));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    function onFocusIn(e: FocusEvent) {
      const el = eligibleField(e.target);
      if (!el) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setField(el);
    }
    function onFocusOut(e: FocusEvent) {
      if (!eligibleField(e.target)) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      // Grace period so focus hopping between fields doesn't flicker the tray
      hideTimer.current = setTimeout(() => setField(null), HIDE_GRACE_MS);
    }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [enabled]);

  // Keep the focused field visible above the tray. scroll-padding-bottom
  // reserves clearance for scrollIntoView's calculation without adding any
  // box height itself, so it can't introduce a scrollbar on a page (like the
  // kiosk calendar) that's deliberately locked to the viewport. Applied to
  // whichever container actually scrolls the field, not always the document.
  useEffect(() => {
    if (!field) return;
    const scrollParent = findScrollParent(field);
    const prevPadding = scrollParent.style.scrollPaddingBottom;
    scrollParent.style.scrollPaddingBottom = KEYBOARD_PAD_PX + 'px';
    const t = setTimeout(() => {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 220);
    return () => {
      clearTimeout(t);
      scrollParent.style.scrollPaddingBottom = prevPadding;
    };
  }, [field]);

  if (!enabled) return null;
  return <OnScreenKeyboard field={field} onDone={() => field?.blur()} />;
}
