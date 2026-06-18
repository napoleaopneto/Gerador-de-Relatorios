import { useRef } from 'react';
import { useDoc } from '../store';
import { snap } from '../model';

const HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];

export default function Frame({ el, editing, onDoubleClick, children, zoom = 1, snapOn = false }) {
  const { selectedIds, selectedElements, select, updateElement, updateMany, checkpoint } =
    useDoc();
  const selected = selectedIds.includes(el.id);
  const drag = useRef(null);

  function onDragStart(e) {
    if (editing) return;
    e.stopPropagation();
    // Clicking an unselected element starts a fresh single selection; clicking
    // an already-selected one keeps the whole group so it moves together.
    if (!selected) select(el.id, e.shiftKey);
    checkpoint();
    const group = selected ? selectedElements : [el];
    drag.current = {
      mode: 'move',
      sx: e.clientX,
      sy: e.clientY,
      origins: group.map((g) => ({ id: g.id, x: g.x, y: g.y })),
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onResizeStart(e, dir) {
    e.stopPropagation();
    e.preventDefault();
    select(el.id);
    checkpoint();
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
    const dx = (e.clientX - d.sx) / zoom;
    const dy = (e.clientY - d.sy) / zoom;

    if (d.mode === 'move') {
      const updates = {};
      for (const o of d.origins) {
        updates[o.id] = { x: snap(o.x + dx, snapOn), y: snap(o.y + dy, snapOn) };
      }
      updateMany(updates);
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
      x: snap(x, snapOn),
      y: snap(y, snapOn),
      w: snap(w, snapOn),
      h: snap(h, snapOn),
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
        select(el.id, e.shiftKey);
      }}
      onDoubleClick={onDoubleClick}
    >
      {children}
      {!editing && <div className="drag-handle" onMouseDown={onDragStart} />}
      {selected &&
        selectedIds.length === 1 &&
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
