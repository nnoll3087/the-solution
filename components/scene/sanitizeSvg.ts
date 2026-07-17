// Strict whitelist sanitizer for AI-generated SVG markup. Only plain drawing
// elements and presentation attributes survive; anything executable or
// URL-referencing is stripped. Returns null when nothing safe remains.

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'polyline',
]);

const ALLOWED_ATTRS = new Set([
  'viewbox', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
  'x1', 'y1', 'x2', 'y2', 'points', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity',
  'fill-opacity', 'stroke-opacity', 'transform', 'fill-rule',
]);

export function sanitizeSvg(markup: string): string | null {
  if (typeof window === 'undefined') return null;
  if (!markup || markup.length > 20000) return null;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  } catch {
    return null;
  }
  if (doc.querySelector('parsererror')) return null;

  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== 'svg') return null;

  function clean(el: Element) {
    for (const child of [...el.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove(); // no text/comment/CDATA nodes
        continue;
      }
      const childEl = child as Element;
      if (!ALLOWED_TAGS.has(childEl.tagName.toLowerCase())) {
        childEl.remove();
        continue;
      }
      clean(childEl);
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (!ALLOWED_ATTRS.has(name) || /url\s*\(|javascript|script|data:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }
  clean(root);

  if (root.children.length === 0) return null;
  return new XMLSerializer().serializeToString(root);
}
