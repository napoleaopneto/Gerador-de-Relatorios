import { createContext, useContext, useReducer, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { newDocument, normalizeDoc } from './model';

const DocContext = createContext(null);

const HISTORY_LIMIT = 80;
const PASTE_OFFSET = 16;

// Push the current doc onto the undo stack and clear redo. Used by every
// discrete mutation and by checkpoint() before continuous gestures (drag,
// typing) so a whole gesture collapses into a single undo step.
function record(state, nextDoc) {
  return {
    ...state,
    doc: { ...nextDoc, updatedAt: Date.now() },
    past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
    future: [],
  };
}

function cloneElement(el, dx = 0, dy = 0) {
  return { ...el, id: uuid(), x: (el.x || 0) + dx, y: (el.y || 0) + dy };
}

function reducer(state, action) {
  const doc = state.doc;

  switch (action.type) {
    case 'LOAD':
      return {
        doc: normalizeDoc(action.doc),
        selectedIds: [],
        clipboard: state.clipboard,
        insertPoint: { x: 60, y: 60 },
        past: [],
        future: [],
      };

    case 'SET_INSERT':
      return { ...state, insertPoint: action.point };

    case 'CHECKPOINT':
      // Snapshot before a continuous edit; no doc change yet.
      return { ...state, past: [...state.past, state.doc].slice(-HISTORY_LIMIT), future: [] };

    case 'SET_META':
      return record(state, { ...doc, ...action.patch });

    case 'ADD_ELEMENT':
      return {
        ...record(state, { ...doc, elements: [...doc.elements, action.element] }),
        selectedIds: [action.element.id],
      };

    case 'ADD_MANY':
      return {
        ...record(state, { ...doc, elements: [...doc.elements, ...action.elements] }),
        selectedIds: action.elements.map((e) => e.id),
      };

    case 'UPDATE_ELEMENT': {
      // Continuous edit — no history here (see CHECKPOINT).
      const elements = doc.elements.map((e) =>
        e.id === action.id ? { ...e, ...action.patch } : e
      );
      return { ...state, doc: { ...doc, elements, updatedAt: Date.now() } };
    }

    case 'UPDATE_MANY': {
      const map = action.updates; // { id: patch }
      const elements = doc.elements.map((e) =>
        map[e.id] ? { ...e, ...map[e.id] } : e
      );
      return { ...state, doc: { ...doc, elements, updatedAt: Date.now() } };
    }

    case 'DELETE_MANY': {
      const kill = new Set(action.ids);
      const elements = doc.elements.filter((e) => !kill.has(e.id));
      return { ...record(state, { ...doc, elements }), selectedIds: [] };
    }

    case 'REORDER': {
      // dir: 'front' | 'back' | 'forward' | 'backward'
      const idx = doc.elements.findIndex((e) => e.id === action.id);
      if (idx < 0) return state;
      const els = [...doc.elements];
      const [item] = els.splice(idx, 1);
      if (action.dir === 'front') els.push(item);
      else if (action.dir === 'back') els.unshift(item);
      else if (action.dir === 'forward') els.splice(Math.min(els.length, idx + 1), 0, item);
      else els.splice(Math.max(0, idx - 1), 0, item);
      return record(state, { ...doc, elements: els });
    }

    case 'COPY': {
      const sel = new Set(state.selectedIds);
      const clip = doc.elements.filter((e) => sel.has(e.id));
      return { ...state, clipboard: clip };
    }

    case 'PASTE': {
      if (!state.clipboard.length) return state;
      const clones = state.clipboard.map((e) => cloneElement(e, PASTE_OFFSET, PASTE_OFFSET));
      return {
        ...record(state, { ...doc, elements: [...doc.elements, ...clones] }),
        selectedIds: clones.map((e) => e.id),
      };
    }

    case 'DUPLICATE': {
      const sel = new Set(state.selectedIds);
      const src = doc.elements.filter((e) => sel.has(e.id));
      if (!src.length) return state;
      const clones = src.map((e) => cloneElement(e, PASTE_OFFSET, PASTE_OFFSET));
      return {
        ...record(state, { ...doc, elements: [...doc.elements, ...clones] }),
        selectedIds: clones.map((e) => e.id),
      };
    }

    case 'SELECT':
      return { ...state, selectedIds: action.ids };

    case 'UNDO': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
        selectedIds: [],
      };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedIds: [],
      };
    }

    default:
      return state;
  }
}

export function DocProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    doc: newDocument(),
    selectedIds: [],
    clipboard: [],
    insertPoint: { x: 60, y: 60 },
    past: [],
    future: [],
  }));

  const selectedIds = state.selectedIds;
  const primaryId = selectedIds[0] ?? null;

  const api = useMemo(
    () => ({
      doc: state.doc,
      selectedIds,
      // back-compat single-selection helpers
      selectedId: primaryId,
      selected: primaryId
        ? state.doc.elements.find((e) => e.id === primaryId) || null
        : null,
      selectedElements: state.doc.elements.filter((e) => selectedIds.includes(e.id)),
      insertPoint: state.insertPoint,
      setInsertPoint: (point) => dispatch({ type: 'SET_INSERT', point }),
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      clipboardCount: state.clipboard.length,

      load: (doc) => dispatch({ type: 'LOAD', doc }),
      setMeta: (patch) => dispatch({ type: 'SET_META', patch }),
      checkpoint: () => dispatch({ type: 'CHECKPOINT' }),
      addElement: (element) => dispatch({ type: 'ADD_ELEMENT', element }),
      addMany: (elements) => dispatch({ type: 'ADD_MANY', elements }),
      updateElement: (id, patch) => dispatch({ type: 'UPDATE_ELEMENT', id, patch }),
      updateMany: (updates) => dispatch({ type: 'UPDATE_MANY', updates }),
      deleteElement: (id) => dispatch({ type: 'DELETE_MANY', ids: [id] }),
      deleteMany: (ids) => dispatch({ type: 'DELETE_MANY', ids }),
      reorder: (id, dir) => dispatch({ type: 'REORDER', id, dir }),

      select: (id, additive = false) => {
        if (id == null) return dispatch({ type: 'SELECT', ids: [] });
        if (!additive) return dispatch({ type: 'SELECT', ids: [id] });
        const set = new Set(selectedIds);
        set.has(id) ? set.delete(id) : set.add(id);
        dispatch({ type: 'SELECT', ids: [...set] });
      },
      selectMany: (ids) => dispatch({ type: 'SELECT', ids }),
      selectAll: () =>
        dispatch({ type: 'SELECT', ids: state.doc.elements.map((e) => e.id) }),

      copy: () => dispatch({ type: 'COPY' }),
      paste: () => dispatch({ type: 'PASTE' }),
      duplicate: () => dispatch({ type: 'DUPLICATE' }),
      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  return <DocContext.Provider value={api}>{children}</DocContext.Provider>;
}

export function useDoc() {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error('useDoc fora do DocProvider');
  return ctx;
}
