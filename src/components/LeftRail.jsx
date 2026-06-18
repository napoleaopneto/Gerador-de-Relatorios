import { useRef } from 'react';
import { useDoc } from '../store';
import {
  newTextElement,
  newImageElement,
  newTableElement,
  newShapeElement,
  newSignatureElement,
  newQRElement,
} from '../model';

export default function LeftRail() {
  const { addElement, insertPoint } = useDoc();
  const fileRef = useRef(null);
  const at = () => [insertPoint.x, insertPoint.y];

  function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 360;
        let w = img.width;
        let h = img.height;
        if (w > max) {
          h = (h * max) / w;
          w = max;
        }
        addElement(newImageElement(reader.result, Math.round(w), Math.round(h), insertPoint.x, insertPoint.y));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function addVar() {
    const name = prompt('Nome da variável (ex: nome, data, empresa):', 'nome');
    if (!name) return;
    const el = newTextElement(...at());
    el.html = `Olá, {{${name}}}!`;
    addElement(el);
  }

  // Each item can be dragged onto the canvas (drops at the cursor) or clicked
  // (drops at the last clicked point / default).
  const items = [
    { ico: 'T', label: 'Texto', kind: 'text', onClick: () => addElement(newTextElement(...at())) },
    { ico: '🖼', label: 'Imagem', onClick: () => fileRef.current?.click() },
    { ico: '▦', label: 'Tabela', kind: 'table', onClick: () => addElement(newTableElement(...at())) },
    { ico: '▭', label: 'Retângulo', kind: 'rect', onClick: () => addElement(newShapeElement('rect', ...at())) },
    { ico: '◯', label: 'Elipse', kind: 'ellipse', onClick: () => addElement(newShapeElement('ellipse', ...at())) },
    { ico: '△', label: 'Triângulo', kind: 'triangle', onClick: () => addElement(newShapeElement('triangle', ...at())) },
    { ico: '╱', label: 'Linha', kind: 'line', onClick: () => addElement(newShapeElement('line', ...at())) },
    { ico: '→', label: 'Seta', kind: 'arrow', onClick: () => addElement(newShapeElement('arrow', ...at())) },
    { ico: '✒', label: 'Assinatura', kind: 'signature', onClick: () => addElement(newSignatureElement(...at())) },
    { ico: '▣', label: 'QR Code', kind: 'qr', onClick: () => addElement(newQRElement(...at())) },
    { ico: '{ }', label: 'Variável', kind: 'variable', onClick: addVar },
  ];

  return (
    <div className="left-rail">
      {items.map((it) => (
        <button
          key={it.label}
          className="rail-btn"
          title={it.kind ? `${it.label} — clique ou arraste para a folha` : it.label}
          onClick={it.onClick}
          draggable={!!it.kind}
          onDragStart={
            it.kind
              ? (e) => {
                  e.dataTransfer.setData('application/x-el', it.kind);
                  e.dataTransfer.effectAllowed = 'copy';
                }
              : undefined
          }
        >
          <span className="ico">{it.ico}</span>
          <span>{it.label}</span>
        </button>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPickImage}
      />
    </div>
  );
}
