import { v4 as uuid } from 'uuid';

// A4 @ 96 DPI
export const PAGE_SIZES = {
  A4: { label: 'A4', w: 794, h: 1123 },
  A5: { label: 'A5', w: 559, h: 794 },
  Carta: { label: 'Carta', w: 816, h: 1056 },
  Paisagem: { label: 'A4 Paisagem', w: 1123, h: 794 },
};

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
  return {
    id: uuid(),
    type: 'shape',
    shape, // rect | ellipse | line
    x,
    y,
    w: shape === 'line' ? 200 : 160,
    h: shape === 'line' ? 2 : 120,
    rotation: 0,
    fill: shape === 'line' ? 'transparent' : '#4263eb',
    stroke: '#1c3aa9',
    strokeWidth: shape === 'line' ? 2 : 1,
  };
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
