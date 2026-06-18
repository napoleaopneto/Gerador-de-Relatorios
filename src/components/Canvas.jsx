import { useEffect, useRef, useState } from 'react';
import { useDoc } from '../store';
import { PAGE_SIZES, pageCount, GRID } from '../model';
import Frame from './Frame';
import { ElementRenderer } from './Elements';

function isEditingTarget(t) {
  return (
    t &&
    (t.isContentEditable ||
      t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT')
  );
}

export default function Canvas() {
  const {
    doc,
    select,
    selectMany,
    selectAll,
    selectedIds,
    updateElement,
    updateMany,
    deleteMany,
    checkpoint,
    copy,
    paste,
    duplicate,
    undo,
    redo,
  } = useDoc();
  const [editingId, setEditingId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [snapOn, setSnapOn] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [marquee, setMarquee] = useState(null);
  const sheetRef = useRef(null);

  const size = PAGE_SIZES[doc.pageSize] || PAGE_SIZES.A4;
  const pages = pageCount(doc, size);

  function commit(id, html) {
    updateElement(id, { html });
  }

  function startEdit(id) {
    checkpoint();
    setEditingId(id);
  }

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    function onKey(e) {
      if (isEditingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copy();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        paste();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        deleteMany(selectedIds);
        return;
      }
      if (e.key.startsWith('Arrow') && selectedIds.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        checkpoint();
        const updates = {};
        doc.elements.forEach((el) => {
          if (selectedIds.includes(el.id)) updates[el.id] = { x: el.x + dx, y: el.y + dy };
        });
        updateMany(updates);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, doc.elements]);

  // ---------- marquee (rubber-band) selection ----------
  function onSheetDown(e) {
    if (e.target !== sheetRef.current) return; // only empty background
    select(null);
    setEditingId(null);
    const rect = sheetRef.current.getBoundingClientRect();
    const start = {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
    setMarquee({ ...start, w: 0, h: 0 });

    const onMove = (ev) => {
      const cx = (ev.clientX - rect.left) / zoom;
      const cy = (ev.clientY - rect.top) / zoom;
      setMarquee({
        x: Math.min(start.x, cx),
        y: Math.min(start.y, cy),
        w: Math.abs(cx - start.x),
        h: Math.abs(cy - start.y),
      });
    };
    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const cx = (ev.clientX - rect.left) / zoom;
      const cy = (ev.clientY - rect.top) / zoom;
      const box = {
        x: Math.min(start.x, cx),
        y: Math.min(start.y, cy),
        w: Math.abs(cx - start.x),
        h: Math.abs(cy - start.y),
      };
      setMarquee(null);
      if (box.w < 4 && box.h < 4) return;
      const hits = doc.elements
        .filter(
          (el) =>
            el.x < box.x + box.w &&
            el.x + el.w > box.x &&
            el.y < box.y + box.h &&
            el.y + el.h > box.y
        )
        .map((el) => el.id);
      if (hits.length) selectMany(hits);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const clampZoom = (z) => Math.min(2, Math.max(0.25, z));

  return (
    <div className="canvas-area">
      <div className="canvas-bar">
        <button className="tbtn" title="Diminuir zoom" onClick={() => setZoom((z) => clampZoom(z - 0.1))}>
          −
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="tbtn" title="Aumentar zoom" onClick={() => setZoom((z) => clampZoom(z + 0.1))}>
          +
        </button>
        <button className="tbtn" title="Restaurar zoom" onClick={() => setZoom(1)}>
          ⟲
        </button>
        <span className="bar-sep" />
        <button
          className={`tbtn ${showGrid ? 'active' : ''}`}
          title="Mostrar grade"
          onClick={() => setShowGrid((g) => !g)}
        >
          # Grade
        </button>
        <button
          className={`tbtn ${snapOn ? 'active' : ''}`}
          title="Ajustar à grade"
          onClick={() => setSnapOn((s) => !s)}
        >
          🧲 Snap
        </button>
        {selectedIds.length > 1 && (
          <span className="zoom-label">{selectedIds.length} selecionados</span>
        )}
      </div>

      <div className="canvas-wrap" onMouseDown={() => select(null)}>
        <div
          className="zoom-stage"
          style={{ width: size.w * zoom, height: pages * size.h * zoom }}
        >
          <div
            className={`page sheet ${showGrid ? 'show-grid' : ''}`}
            id="doc-sheet"
            ref={sheetRef}
            style={{
              width: size.w,
              height: pages * size.h,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundSize: showGrid ? `${GRID}px ${GRID}px` : undefined,
            }}
            onMouseDown={onSheetDown}
          >
            {/* per-page header / footer / break guides */}
            {Array.from({ length: pages }).map((_, pi) => (
              <div key={pi}>
                {doc.showHeader && (
                  <div className="page-band page-header-band" style={{ top: pi * size.h }}>
                    {doc.headerText}
                  </div>
                )}
                {doc.showFooter && (
                  <div className="page-band page-footer-band" style={{ top: (pi + 1) * size.h - 32 }}>
                    {doc.footerText.replace('{{pagina}}', pi + 1)}
                  </div>
                )}
                {pi > 0 && <div className="page-break" style={{ top: pi * size.h }} />}
                <div className="page-num" style={{ top: (pi + 1) * size.h - 20 }}>
                  Página {pi + 1} / {pages}
                </div>
              </div>
            ))}

            {doc.elements.map((el) => (
              <Frame
                key={el.id}
                el={el}
                zoom={zoom}
                snapOn={snapOn}
                editing={editingId === el.id}
                onDoubleClick={() => el.type === 'text' && startEdit(el.id)}
              >
                <ElementRenderer
                  el={el}
                  editing={editingId === el.id}
                  onStartEdit={startEdit}
                  onCommit={commit}
                />
              </Frame>
            ))}

            {marquee && (
              <div
                className="marquee"
                style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
