import { raw } from 'hast-util-raw';
import { visit, SKIP } from 'unist-util-visit';

/**
 * Strips anything that runs code out of an article as it is built. Pages written in the
 * editor go live without review when they are the writer's own, and raw HTML in the
 * markdown reaches the page as written. A script there would run on the same site as
 * the editor, which keeps every writer's GitHub token in the browser.
 *
 * Astro runs plugins like this one before it parses raw HTML, so the raw HTML is parsed
 * here first and checked as elements. Whatever Astro does after sees the same tree.
 */
const DROP = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'base', 'meta', 'link', 'form', 'portal']);
// Whitespace and control characters are ignored inside a scheme, so "java\tscript:" runs too.
const BAD_URL = /^(?:javascript|vbscript|data:text\/html)/i;
const RUNS = (v) => BAD_URL.test(String(v).replace(/[\s\u0000-\u001f]+/g, ''))
  || /(?:java|vb)script:/i.test(String(v).replace(/[\s\u0000-\u001f]+/g, ''));

export function clean(tree) {
  visit(tree, 'element', (node, i, parent) => {
    if (DROP.has(node.tagName.toLowerCase())) {
      parent.children.splice(i, 1);
      return [SKIP, i];
    }
    for (const [k, v] of Object.entries(node.properties || {})) {
      if (/^on/i.test(k) || [].concat(v).some(RUNS)) delete node.properties[k];
    }
  });
  return tree;
}

export default function rehypeSafe() {
  return (tree, file) => clean(raw(tree, { file }));
}
