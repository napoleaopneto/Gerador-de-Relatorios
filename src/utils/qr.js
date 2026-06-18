import QRCode from 'qrcode';

// Build a self-contained SVG string for a QR code. Synchronous (uses the
// matrix builder directly) so it works both in React render and in the
// HTML/print/PDF export string builders.
export function qrSvg(value, size = 120) {
  let qr;
  try {
    qr = QRCode.create(value || ' ', { errorCorrectionLevel: 'M' });
  } catch {
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }
  const data = qr.modules.data;
  const count = qr.modules.size;
  const cell = size / count;
  let rects = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (data[r * count + c]) {
        const x = (c * cell).toFixed(2);
        const y = (r * cell).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}
