import { useEffect, useRef } from 'react';
import { useDoc } from '../store';
import { resolveAutoFields, applyMergeRow } from '../model';
import { qrSvg } from '../utils/qr';

function highlightVars(html) {
  return html.replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    '<span class="var-token">{{$1}}</span>'
  );
}

// Resolve {{data}}/{{hora}} and any filled merge vars, then highlight the
// remaining (unfilled) tokens so the user still sees them in the editor.
function displayHtml(html, vars) {
  return highlightVars(applyMergeRow(resolveAutoFields(html || ''), vars || {}));
}

export function TextElement({ el, editing, onStartEdit, onCommit }) {
  const ref = useRef(null);
  const { doc, updateElement } = useDoc();

  // Size the element to fit its content exactly. Measure with height:auto so
  // it can shrink too — at height:100% scrollHeight never drops below el.h.
  function fit(node) {
    if (!node) return;
    const prev = node.style.height;
    node.style.height = 'auto';
    const h = node.scrollHeight;
    node.style.height = prev;
    if (Math.abs(h - el.h) > 2) updateElement(el.id, { h });
  }

  // When entering edit mode, load the raw html into the editable node.
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.innerHTML = el.html || '';
      ref.current.focus();
      fit(ref.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Re-measure display content when html or width changes.
  useEffect(() => {
    if (!editing) fit(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.html, el.w, editing, doc.vars]);

  if (editing) {
    return (
      <div
        ref={ref}
        className="el-text"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          fit(e.currentTarget);
          // Commit live so toolbar (font/size) can blur the field without losing edits.
          onCommit(el.id, e.currentTarget.innerHTML);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div
      ref={ref}
      className="el-text"
      onDoubleClick={() => onStartEdit(el.id)}
      dangerouslySetInnerHTML={{ __html: displayHtml(el.html, doc.vars) }}
    />
  );
}

export function ImageElement({ el }) {
  return <img className="el-image" src={el.src} alt="" draggable={false} />;
}

export function SignatureElement({ el }) {
  const { doc } = useDoc();
  const name = applyMergeRow(resolveAutoFields(el.name || ''), doc.vars || {});
  return (
    <div className="el-signature">
      <div className="sig-name">{name}</div>
      <div className="sig-line" />
      <div className="sig-label">{el.label}</div>
    </div>
  );
}

export function QRElement({ el }) {
  const { doc } = useDoc();
  const value = applyMergeRow(resolveAutoFields(el.value || ''), doc.vars || {});
  const px = Math.min(el.w, el.h);
  return (
    <div
      className="el-qr"
      dangerouslySetInnerHTML={{ __html: qrSvg(value, px) }}
    />
  );
}

export function ShapeElement({ el }) {
  const common = { fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth };
  if (el.shape === 'line') {
    return (
      <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
        <line x1="0" y1={el.h / 2} x2={el.w} y2={el.h / 2} stroke={el.stroke} strokeWidth={el.strokeWidth} />
      </svg>
    );
  }
  if (el.shape === 'arrow') {
    const my = el.h / 2;
    const head = Math.min(el.w * 0.3, el.h);
    return (
      <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
        <line x1="0" y1={my} x2={el.w - head} y2={my} stroke={el.stroke} strokeWidth={el.strokeWidth} />
        <polygon points={`${el.w},${my} ${el.w - head},${my - head / 2} ${el.w - head},${my + head / 2}`} fill={el.stroke} />
      </svg>
    );
  }
  if (el.shape === 'triangle') {
    const s = el.strokeWidth;
    return (
      <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
        <polygon points={`${el.w / 2},${s} ${el.w - s},${el.h - s} ${s},${el.h - s}`} {...common} />
      </svg>
    );
  }
  return (
    <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
      {el.shape === 'ellipse' ? (
        <ellipse cx={el.w / 2} cy={el.h / 2} rx={el.w / 2 - el.strokeWidth} ry={el.h / 2 - el.strokeWidth} {...common} />
      ) : (
        <rect x={el.strokeWidth} y={el.strokeWidth} width={el.w - el.strokeWidth * 2} height={el.h - el.strokeWidth * 2} {...common} />
      )}
    </svg>
  );
}

export function ElementRenderer({ el, editing, onStartEdit, onCommit }) {
  if (el.type === 'text')
    return (
      <TextElement el={el} editing={editing} onStartEdit={onStartEdit} onCommit={onCommit} />
    );
  if (el.type === 'image') return <ImageElement el={el} />;
  if (el.type === 'shape') return <ShapeElement el={el} />;
  if (el.type === 'signature') return <SignatureElement el={el} />;
  if (el.type === 'qr') return <QRElement el={el} />;
  return null;
}

// re-export for convenience
export { useDoc };
