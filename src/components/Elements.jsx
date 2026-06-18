import { useEffect, useRef } from 'react';
import { useDoc } from '../store';

function highlightVars(html) {
  return html.replace(
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    '<span class="var-token">{{$1}}</span>'
  );
}

export function TextElement({ el, editing, onStartEdit, onCommit }) {
  const ref = useRef(null);
  const { updateElement } = useDoc();

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
  }, [el.html, el.w, editing]);

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
      dangerouslySetInnerHTML={{ __html: highlightVars(el.html || '') }}
    />
  );
}

export function ImageElement({ el }) {
  return <img className="el-image" src={el.src} alt="" draggable={false} />;
}

export function ShapeElement({ el }) {
  if (el.shape === 'line') {
    return (
      <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
        <line
          x1="0"
          y1={el.h / 2}
          x2={el.w}
          y2={el.h / 2}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
      </svg>
    );
  }
  return (
    <svg className="el-shape" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
      {el.shape === 'ellipse' ? (
        <ellipse
          cx={el.w / 2}
          cy={el.h / 2}
          rx={el.w / 2 - el.strokeWidth}
          ry={el.h / 2 - el.strokeWidth}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
      ) : (
        <rect
          x={el.strokeWidth}
          y={el.strokeWidth}
          width={el.w - el.strokeWidth * 2}
          height={el.h - el.strokeWidth * 2}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
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
  return null;
}

// re-export for convenience
export { useDoc };
