import { useRef } from 'react';
import { useDoc } from '../store';

const HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];

export default function Frame({ el, editing, onDoubleClick, children }) {
  const { selectedId, select, updateElement } = useDoc();
  const selected = selectedId === el.id;
  const drag = useRef(null);

  function onDragStart(e) {
    if (editing) return;
    e.stopPropagation();
    select(el.id);
    drag.current = { mode: 'move', sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onResizeStart(e, dir) {
    e.stopPropagation();
    e.preventDefault();
    select(el.id);
    drag.current = {
      mode: 'resize',
      dir,
      sx: e.clientX,
      sy: e.clientY,
      ox: el.x,
      oy: el.y,
      ow: el.w,
      oh: el.h,
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;

    if (d.mode === 'move') {
      updateElement(el.id, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      return;
    }
    // resize
    let { ox, oy, ow, oh } = d;
    let x = ox,
      y = oy,
      w = ow,
      h = oh;
    if (d.dir.includes('e')) w = Math.max(20, ow + dx);
    if (d.dir.includes('s')) h = Math.max(20, oh + dy);
    if (d.dir.includes('w')) {
      w = Math.max(20, ow - dx);
      x = ox + (ow - w);
    }
    if (d.dir.includes('n')) {
      h = Math.max(20, oh - dy);
      y = oy + (oh - h);
    }
    updateElement(el.id, {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    });
  }

  function onUp() {
    drag.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  return (
    <div
      className={`frame ${selected ? 'selected' : ''} ${editing ? 'editing' : ''}`}
      style={{
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        select(el.id);
      }}
      onDoubleClick={onDoubleClick}
    >
      {children}
      {!editing && <div className="drag-handle" onMouseDown={onDragStart} />}
      {selected &&
        HANDLES.map((h) => (
          <div
            key={h}
            className={`resize-handle rh-${h}`}
            onMouseDown={(e) => onResizeStart(e, h)}
          />
        ))}
    </div>
  );
}
