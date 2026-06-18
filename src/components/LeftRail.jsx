import { useRef } from 'react';
import { useDoc } from '../store';
import {
  newTextElement,
  newImageElement,
  newTableElement,
  newShapeElement,
} from '../model';

export default function LeftRail() {
  const { addElement } = useDoc();
  const fileRef = useRef(null);

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
        addElement(newImageElement(reader.result, Math.round(w), Math.round(h)));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function addVar() {
    const name = prompt('Nome da variável (ex: nome, data, empresa):', 'nome');
    if (!name) return;
    const el = newTextElement();
    el.html = `Olá, {{${name}}}!`;
    addElement(el);
  }

  const items = [
    { ico: 'T', label: 'Texto', onClick: () => addElement(newTextElement()) },
    { ico: '🖼', label: 'Imagem', onClick: () => fileRef.current?.click() },
    { ico: '▦', label: 'Tabela', onClick: () => addElement(newTableElement()) },
    { ico: '▭', label: 'Retângulo', onClick: () => addElement(newShapeElement('rect')) },
    { ico: '◯', label: 'Elipse', onClick: () => addElement(newShapeElement('ellipse')) },
    { ico: '╱', label: 'Linha', onClick: () => addElement(newShapeElement('line')) },
    { ico: '{ }', label: 'Variável', onClick: addVar },
  ];

  return (
    <div className="left-rail">
      {items.map((it) => (
        <button key={it.label} className="rail-btn" title={it.label} onClick={it.onClick}>
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
