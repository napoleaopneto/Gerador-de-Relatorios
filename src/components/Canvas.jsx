import { useState } from 'react';
import { useDoc } from '../store';
import { PAGE_SIZES, pageCount } from '../model';
import Frame from './Frame';
import { ElementRenderer } from './Elements';

export default function Canvas() {
  const { doc, select, updateElement } = useDoc();
  const [editingId, setEditingId] = useState(null);
  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);

  function commit(id, html) {
    updateElement(id, { html });
  }

  return (
    <div
      className="canvas-wrap"
      onMouseDown={() => {
        select(null);
        setEditingId(null);
      }}
    >
      <div
        className="page sheet"
        id="doc-sheet"
        style={{ width: size.w, height: pages * size.h }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* per-page header / footer / break guides */}
        {Array.from({ length: pages }).map((_, pi) => (
          <div key={pi}>
            {doc.showHeader && (
              <div
                className="page-band page-header-band"
                style={{ top: pi * size.h }}
              >
                {doc.headerText}
              </div>
            )}
            {doc.showFooter && (
              <div
                className="page-band page-footer-band"
                style={{ top: (pi + 1) * size.h - 32 }}
              >
                {doc.footerText.replace('{{pagina}}', pi + 1)}
              </div>
            )}
            {pi > 0 && (
              <div className="page-break" style={{ top: pi * size.h }} />
            )}
            <div className="page-num" style={{ top: (pi + 1) * size.h - 20 }}>
              Página {pi + 1} / {pages}
            </div>
          </div>
        ))}

        {doc.elements.map((el) => (
          <Frame
            key={el.id}
            el={el}
            editing={editingId === el.id}
            onDoubleClick={() => el.type === 'text' && setEditingId(el.id)}
          >
            <ElementRenderer
              el={el}
              editing={editingId === el.id}
              onStartEdit={setEditingId}
              onCommit={commit}
            />
          </Frame>
        ))}
      </div>
    </div>
  );
}
