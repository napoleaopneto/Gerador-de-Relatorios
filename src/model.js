import { v4 as uuid } from 'uuid';

// A4 @ 96 DPI
export const PAGE_SIZES = {
  A4: { label: 'A4', w: 794, h: 1123 },
  A5: { label: 'A5', w: 559, h: 794 },
  Carta: { label: 'Carta', w: 816, h: 1056 },
  Paisagem: { label: 'A4 Paisagem', w: 1123, h: 794 },
};

// Editor grid (px). Snap rounds positions/sizes to this when enabled.
export const GRID = 8;

export function snap(v, on, grid = GRID) {
  return on ? Math.round(v / grid) * grid : Math.round(v);
}

export const FONTS = [
  'Arial',
  'Calibri',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Segoe UI',
];

export function newTextElement(x = 60, y = 60) {
  return {
    id: uuid(),
    type: 'text',
    x,
    y,
    w: 360,
    h: 80,
    rotation: 0,
    html: 'Clique duas vezes para editar o texto.',
  };
}

export function newImageElement(src, w = 240, h = 160, x = 60, y = 60) {
  return { id: uuid(), type: 'image', x, y, w, h, rotation: 0, src };
}

export function newTableElement(x = 60, y = 60, rows = 3, cols = 3) {
  const head = Array.from({ length: cols }, (_, c) => `<th>Coluna ${c + 1}</th>`).join('');
  const bodyRow = Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('');
  const body = Array.from({ length: rows - 1 }, () => `<tr>${bodyRow}</tr>`).join('');
  const html = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  return { id: uuid(), type: 'text', x, y, w: 420, h: 120, rotation: 0, html };
}

export function newShapeElement(shape = 'rect', x = 60, y = 60) {
  const thin = shape === 'line' || shape === 'arrow';
  return {
    id: uuid(),
    type: 'shape',
    shape, // rect | ellipse | line | arrow | triangle
    x,
    y,
    w: thin ? 200 : 160,
    h: shape === 'line' ? 2 : thin ? 24 : 120,
    rotation: 0,
    fill: thin ? 'transparent' : '#4263eb',
    stroke: '#1c3aa9',
    strokeWidth: thin ? 2 : 1,
  };
}

export function newSignatureElement(x = 60, y = 60) {
  return {
    id: uuid(),
    type: 'signature',
    x,
    y,
    w: 260,
    h: 70,
    rotation: 0,
    label: 'Assinatura',
    name: '',
  };
}

export function newQRElement(x = 60, y = 60) {
  return {
    id: uuid(),
    type: 'qr',
    x,
    y,
    w: 120,
    h: 120,
    rotation: 0,
    value: 'https://exemplo.com',
  };
}

// Resolve built-in dynamic fields. `pagina` stays a literal token because it
// is only known per-page at render/print time.
export function resolveAutoFields(html, opts = {}) {
  if (!html) return html;
  const now = opts.now || new Date();
  const data = now.toLocaleDateString('pt-BR');
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return html
    .replace(/\{\{\s*data\s*\}\}/gi, data)
    .replace(/\{\{\s*hora\s*\}\}/gi, hora);
}

// Replace {{Grupo.campo}} / {{campo}} tokens from a flat or nested data row.
// `pagina`/`data`/`hora` are left untouched here (handled elsewhere).
const RESERVED = new Set(['pagina', 'data', 'hora']);
export function applyMergeRow(html, row) {
  if (!html || !row) return html;
  return html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key) => {
    if (RESERVED.has(key.toLowerCase())) return m;
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), row);
    return val == null ? m : String(val);
  });
}

// Collect every {{token}} used across the document's text/signature/qr fields.
export function collectVariables(doc) {
  const found = new Set();
  const scan = (s) => {
    if (!s) return;
    const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
    let m;
    while ((m = re.exec(s))) {
      const k = m[1].toLowerCase();
      if (!RESERVED.has(k)) found.add(m[1]);
    }
  };
  (doc.elements || []).forEach((el) => {
    scan(el.html);
    scan(el.name);
    scan(el.value);
  });
  scan(doc.headerText);
  scan(doc.footerText);
  return [...found];
}

export function newDocument(name = 'Documento sem título') {
  return {
    id: uuid(),
    name,
    pageSize: 'A4',
    showHeader: false,
    showFooter: false,
    headerText: 'Cabeçalho',
    footerText: 'Rodapé — página {{pagina}}',
    elements: [],
    vars: {}, // saved values for {{variáveis}} (single-doc preview / fill)
    updatedAt: Date.now(),
  };
}

// Old docs/examples stored elements under pages[]. Flatten to a single
// continuous list so the new flow model can render them.
export function normalizeDoc(doc) {
  if (Array.isArray(doc.elements)) return doc;
  const elements = (doc.pages || []).flatMap((p) => p.elements || []);
  const { pages, ...rest } = doc;
  return { ...rest, elements };
}

// Number of A4 pages needed to contain all elements.
export function pageCount(doc, size) {
  const bottom = (doc.elements || []).reduce(
    (m, el) => Math.max(m, el.y + el.h),
    0
  );
  return Math.max(1, Math.ceil(bottom / size.h));
}
