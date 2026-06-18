import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { asBlob } from 'html-docx-js-typescript';
import { PAGE_SIZES, pageCount } from '../model';

function sheetNode() {
  return document.getElementById('doc-sheet');
}

async function snapshot(node) {
  return html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Crop one A4 page slice out of the full-sheet canvas.
function pageSlice(full, pageIndex, pageHpx, scale) {
  const c = document.createElement('canvas');
  c.width = full.width;
  c.height = pageHpx * scale;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(full, 0, -pageIndex * pageHpx * scale);
  return c;
}

export async function exportPDF(doc) {
  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);
  const orientation = size.w > size.h ? 'landscape' : 'portrait';
  const full = await snapshot(sheetNode());
  const scale = full.width / size.w;
  const pdf = new jsPDF({ orientation, unit: 'px', format: [size.w, size.h] });
  for (let i = 0; i < pages; i++) {
    const slice = pageSlice(full, i, size.h, scale);
    const img = slice.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage([size.w, size.h], orientation);
    pdf.addImage(img, 'JPEG', 0, 0, size.w, size.h);
  }
  pdf.save(`${doc.name || 'documento'}.pdf`);
}

export async function exportPNG(doc) {
  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);
  const full = await snapshot(sheetNode());
  const scale = full.width / size.w;
  for (let i = 0; i < pages; i++) {
    const slice = pageSlice(full, i, size.h, scale);
    await new Promise((res) =>
      slice.toBlob((blob) => {
        const suffix = pages > 1 ? `-pagina-${i + 1}` : '';
        saveBlob(blob, `${doc.name || 'documento'}${suffix}.png`);
        res();
      }, 'image/png')
    );
  }
}

function buildStandaloneHTML(doc) {
  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);

  const els = doc.elements
    .map((el) => {
      const base = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;transform:rotate(${el.rotation || 0}deg);`;
      if (el.type === 'text')
        return `<div style="${base}padding:4px 6px;overflow:hidden;">${el.html || ''}</div>`;
      if (el.type === 'image')
        return `<img src="${el.src}" style="${base}object-fit:fill;" />`;
      if (el.type === 'shape') {
        if (el.shape === 'line')
          return `<div style="${base}border-top:${el.strokeWidth}px solid ${el.stroke};"></div>`;
        const radius = el.shape === 'ellipse' ? '50%' : '0';
        return `<div style="${base}background:${el.fill};border:${el.strokeWidth}px solid ${el.stroke};border-radius:${radius};"></div>`;
      }
      return '';
    })
    .join('\n');

  const bands = Array.from({ length: pages })
    .map((_, pi) => {
      const h = doc.showHeader
        ? `<div style="position:absolute;top:${pi * size.h}px;left:0;right:0;padding:8px 16px;font-size:11px;color:#888;border-bottom:1px dashed #e0e0e0;">${doc.headerText}</div>`
        : '';
      const f = doc.showFooter
        ? `<div style="position:absolute;top:${(pi + 1) * size.h - 32}px;left:0;right:0;padding:8px 16px;font-size:11px;color:#888;border-top:1px dashed #e0e0e0;">${doc.footerText.replace('{{pagina}}', pi + 1)}</div>`
        : '';
      return h + f;
    })
    .join('\n');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${doc.name}</title>
<style>body{margin:0;background:#eee;padding:24px;font-family:Arial,sans-serif;}
.sheet{position:relative;width:${size.w}px;height:${pages * size.h}px;background:#fff;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.2);}
table{border-collapse:collapse;width:100%;}td,th{border:1px solid #999;padding:4px 6px;}
@media print{body{background:#fff;padding:0;}.sheet{box-shadow:none;}@page{size:${size.w}px ${size.h}px;margin:0;}}</style>
</head><body><div class="sheet">${bands}${els}</div></body></html>`;
}

export function exportHTML(doc) {
  const html = buildStandaloneHTML(doc);
  saveBlob(new Blob([html], { type: 'text/html' }), `${doc.name || 'documento'}.html`);
}

// Build HTML split into one .page block per page. Each page is a viewport of
// size.w × size.h clipping the absolute layout, offset by -pi*size.h so the
// right slice shows. page-break-after forces a hard break between pages.
function buildPrintHTML(doc) {
  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);

  function elsAt(pi) {
    const off = -pi * size.h;
    return doc.elements
      .map((el) => {
        const base = `position:absolute;left:${el.x}px;top:${el.y + off}px;width:${el.w}px;height:${el.h}px;transform:rotate(${el.rotation || 0}deg);`;
        if (el.type === 'text')
          return `<div class="el-text" style="${base}">${el.html || ''}</div>`;
        if (el.type === 'image')
          return `<img src="${el.src}" style="${base}object-fit:fill;" />`;
        if (el.type === 'shape') {
          if (el.shape === 'line')
            return `<div style="${base}border-top:${el.strokeWidth}px solid ${el.stroke};"></div>`;
          const radius = el.shape === 'ellipse' ? '50%' : '0';
          return `<div style="${base}background:${el.fill};border:${el.strokeWidth}px solid ${el.stroke};border-radius:${radius};"></div>`;
        }
        return '';
      })
      .join('\n');
  }

  const pageDivs = Array.from({ length: pages })
    .map((_, pi) => {
      const h = doc.showHeader
        ? `<div style="position:absolute;top:0;left:0;right:0;padding:8px 16px;font-size:11px;color:#888;border-bottom:1px dashed #e0e0e0;">${doc.headerText}</div>`
        : '';
      const f = doc.showFooter
        ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:8px 16px;font-size:11px;color:#888;border-top:1px dashed #e0e0e0;">${doc.footerText.replace('{{pagina}}', pi + 1)}</div>`
        : '';
      return `<div class="page">${h}${f}${elsAt(pi)}</div>`;
    })
    .join('\n');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${doc.name}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}
body{background:#fff;font-family:Arial,sans-serif;}
.page{position:relative;width:${size.w}px;height:${size.h}px;background:#fff;overflow:hidden;page-break-after:always;}
.page:last-child{page-break-after:auto;}
.el-text{padding:4px 6px;overflow:hidden;font-size:14px;line-height:1.4;}
table{border-collapse:collapse;width:100%;}td,th{border:1px solid #999;padding:4px 6px;}
@page{size:${size.w}px ${size.h}px;margin:0;}</style>
</head><body>${pageDivs}</body></html>`;
}

// Imprimir: render paginated HTML into a hidden iframe and open the browser
// print dialog directly — no visible window/tab. Iframe removed after print.
export function openPreview(doc) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const cleanup = () => iframe.remove();
  iframe.onload = () => {
    const win = iframe.contentWindow;
    win.focus();
    win.print();
    // Remove after the print dialog closes (afterprint), with a fallback.
    win.onafterprint = cleanup;
    setTimeout(cleanup, 60000);
  };

  const fdoc = iframe.contentWindow.document;
  fdoc.open();
  fdoc.write(buildPrintHTML(doc));
  fdoc.close();
}

export async function exportDOCX(doc) {
  // DOCX flattens absolute layout into stacked content (text/tables/images).
  const parts = doc.elements
    .map((el) => {
      if (el.type === 'text') return `<div>${el.html || ''}</div>`;
      if (el.type === 'image')
        return `<p><img src="${el.src}" width="${el.w}" height="${el.h}" /></p>`;
      return '';
    })
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${parts}</body></html>`;
  const blob = await asBlob(html);
  saveBlob(blob, `${doc.name || 'documento'}.docx`);
}
