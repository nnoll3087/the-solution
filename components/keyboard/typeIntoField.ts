// Text mutation helpers for the on-screen keyboard. Values are written through
// the native prototype setter and followed by a bubbling `input` event so
// React's controlled inputs see the change as if it were real typing; assigning
// el.value directly would be ignored by React's internal value tracker.

export type EditableField = HTMLInputElement | HTMLTextAreaElement;

// Input types that legally support selectionStart/setSelectionRange
const SELECTION_TYPES = new Set(['text', 'password', 'search', 'url', 'tel']);

function supportsSelection(el: EditableField): boolean {
  return el instanceof HTMLTextAreaElement || SELECTION_TYPES.has(el.type);
}

function applyValue(el: EditableField, value: string, caret: number | null) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  if (caret !== null && supportsSelection(el)) {
    el.setSelectionRange(caret, caret);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function insertText(el: EditableField, text: string) {
  if (supportsSelection(el)) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    applyValue(el, el.value.slice(0, start) + text + el.value.slice(end), start + text.length);
  } else {
    // email/number etc: no selection API, append at the end
    applyValue(el, el.value + text, null);
  }
}

export function deleteBack(el: EditableField) {
  if (supportsSelection(el)) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start === 0 && end === 0) return;
    const from = start === end ? start - 1 : start;
    applyValue(el, el.value.slice(0, from) + el.value.slice(end), from);
  } else {
    if (el.value.length === 0) return;
    applyValue(el, el.value.slice(0, -1), null);
  }
}
