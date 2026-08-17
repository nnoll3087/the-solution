'use client';

import { useRef, useState } from 'react';
import { EditableField, insertText, deleteBack } from './typeIntoField';

// Presentational on-screen keyboard. Stays mounted (for the slide transition)
// and shows whenever a field is set. Every pointerdown inside the tray calls
// preventDefault so taps never steal focus from the field being typed into.

type Props = {
  field: EditableField | null;
  onDone: () => void;
};

type Layer = 'letters' | 'symbols';
type Shift = 'off' | 'once' | 'caps';

const LETTER_ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const LETTER_ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const LETTER_ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
const SYMBOL_ROW_1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYMBOL_ROW_2 = ['@', '#', '$', '%', '&', '-', '_', '+', '(', ')'];
const SYMBOL_ROW_3 = ['!', '"', "'", ':', ';', '/', '?', '*'];

const DOUBLE_TAP_MS = 400;

function Key({
  label,
  onPress,
  grow = 1,
  active = false,
  subtle = false,
}: {
  label: string;
  onPress: () => void;
  grow?: number;
  active?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={
        'min-h-12 lg:min-h-14 rounded-lg text-lg font-medium select-none transition active:brightness-125 ' +
        (active
          ? 'bg-accent text-white'
          : subtle
            ? 'bg-surface/80 text-text-muted border border-border-themed'
            : 'bg-surface-elevated text-text border border-border-themed')
      }
      style={{ flexGrow: grow, flexBasis: 0 }}
    >
      {label}
    </button>
  );
}

export function OnScreenKeyboard({ field, onDone }: Props) {
  const [layer, setLayer] = useState<Layer>('letters');
  const [shift, setShift] = useState<Shift>('off');
  const lastShiftTap = useRef(0);
  const open = field !== null;

  function pressChar(ch: string) {
    if (!field) return;
    const upper = layer === 'letters' && shift !== 'off';
    insertText(field, upper ? ch.toUpperCase() : ch);
    if (shift === 'once') setShift('off');
  }

  function pressShift() {
    const now = Date.now();
    const doubleTap = now - lastShiftTap.current < DOUBLE_TAP_MS;
    lastShiftTap.current = now;
    if (shift === 'caps') setShift('off');
    else if (shift === 'once') setShift(doubleTap ? 'caps' : 'off');
    else setShift('once');
  }

  function pressBackspace() {
    if (field) deleteBack(field);
  }

  function row(chars: string[]) {
    return chars.map((ch) => (
      <Key key={ch} label={layer === 'letters' && shift !== 'off' ? ch.toUpperCase() : ch} onPress={() => pressChar(ch)} />
    ));
  }

  return (
    <div
      onPointerDown={(e) => e.preventDefault()}
      className={
        'fixed bottom-0 inset-x-0 z-[70] transition-transform duration-200 ease-out ' +
        (open ? 'translate-y-0' : 'translate-y-full pointer-events-none')
      }
    >
      <div className="max-w-3xl mx-auto bg-surface/95 backdrop-blur border-t border-x border-border-themed rounded-t-xl px-1.5 pt-1.5 pb-2 sm:px-3 sm:pb-3 space-y-1.5">
        {layer === 'letters' ? (
          <>
            <div className="flex gap-1 sm:gap-1.5">{row(LETTER_ROW_1)}</div>
            <div className="flex gap-1 sm:gap-1.5 px-4">{row(LETTER_ROW_2)}</div>
            <div className="flex gap-1 sm:gap-1.5">
              <Key
                label={shift === 'caps' ? '⇧ ABC' : '⇧'}
                onPress={pressShift}
                grow={1.5}
                active={shift !== 'off'}
                subtle
              />
              {row(LETTER_ROW_3)}
              <Key label="⌫" onPress={pressBackspace} grow={1.5} subtle />
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1 sm:gap-1.5">{row(SYMBOL_ROW_1)}</div>
            <div className="flex gap-1 sm:gap-1.5">{row(SYMBOL_ROW_2)}</div>
            <div className="flex gap-1 sm:gap-1.5">
              {row(SYMBOL_ROW_3)}
              <Key label="⌫" onPress={pressBackspace} grow={1.5} subtle />
            </div>
          </>
        )}
        <div className="flex gap-1 sm:gap-1.5">
          <Key
            label={layer === 'letters' ? '?123' : 'abc'}
            onPress={() => setLayer(layer === 'letters' ? 'symbols' : 'letters')}
            grow={1.5}
            subtle
          />
          <Key label="@" onPress={() => pressChar('@')} />
          <Key label="space" onPress={() => pressChar(' ')} grow={4} />
          <Key label="." onPress={() => pressChar('.')} />
          <Key label="Done" onPress={onDone} grow={1.5} active />
        </div>
      </div>
    </div>
  );
}
