// Left rail: every item is drag-only. Drag onto the sheet to drop the element
// exactly where the cursor is released (any page). Clicking does nothing.
const ITEMS = [
  { ico: 'T', label: 'Texto', kind: 'text' },
  { ico: '🖼', label: 'Imagem', kind: 'image' },
  { ico: '▦', label: 'Tabela', kind: 'table' },
  { ico: '▭', label: 'Retângulo', kind: 'rect' },
  { ico: '◯', label: 'Elipse', kind: 'ellipse' },
  { ico: '△', label: 'Triângulo', kind: 'triangle' },
  { ico: '╱', label: 'Linha', kind: 'line' },
  { ico: '→', label: 'Seta', kind: 'arrow' },
  { ico: '✒', label: 'Assinatura', kind: 'signature' },
  { ico: '▣', label: 'QR Code', kind: 'qr' },
  { ico: '{ }', label: 'Variável', kind: 'variable' },
];

export default function LeftRail() {
  return (
    <div className="left-rail">
      {ITEMS.map((it) => (
        <button
          key={it.label}
          className="rail-btn"
          title={`${it.label} — arraste para a folha`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-el', it.kind);
            e.dataTransfer.effectAllowed = 'copy';
          }}
        >
          <span className="ico">{it.ico}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
