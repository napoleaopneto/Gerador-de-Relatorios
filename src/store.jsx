import { createContext, useContext, useReducer, useCallback } from 'react';
import { newDocument, normalizeDoc } from './model';

const DocContext = createContext(null);

function reducer(state, action) {
  const doc = state.doc;
  const touch = (d) => ({ ...d, updatedAt: Date.now() });

  switch (action.type) {
    case 'LOAD':
      return { doc: normalizeDoc(action.doc), selectedId: null };

    case 'SET_META':
      return { ...state, doc: touch({ ...doc, ...action.patch }) };

    case 'ADD_ELEMENT':
      return {
        doc: touch({ ...doc, elements: [...doc.elements, action.element] }),
        selectedId: action.element.id,
      };

    case 'UPDATE_ELEMENT': {
      const elements = doc.elements.map((e) =>
        e.id === action.id ? { ...e, ...action.patch } : e
      );
      return { ...state, doc: touch({ ...doc, elements }) };
    }

    case 'DELETE_ELEMENT': {
      const elements = doc.elements.filter((e) => e.id !== action.id);
      return { doc: touch({ ...doc, elements }), selectedId: null };
    }

    case 'REORDER': {
      // dir: 'front' | 'back'
      const idx = doc.elements.findIndex((e) => e.id === action.id);
      if (idx < 0) return state;
      const els = [...doc.elements];
      const [item] = els.splice(idx, 1);
      if (action.dir === 'front') els.push(item);
      else els.unshift(item);
      return { ...state, doc: touch({ ...doc, elements: els }) };
    }

    case 'SELECT':
      return { ...state, selectedId: action.id };

    default:
      return state;
  }
}

export function DocProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    doc: newDocument(),
    selectedId: null,
  }));

  const api = {
    doc: state.doc,
    selectedId: state.selectedId,
    selected: state.selectedId
      ? state.doc.elements.find((e) => e.id === state.selectedId)
      : null,
    load: useCallback((doc) => dispatch({ type: 'LOAD', doc }), []),
    setMeta: useCallback((patch) => dispatch({ type: 'SET_META', patch }), []),
    addElement: useCallback(
      (element) => dispatch({ type: 'ADD_ELEMENT', element }),
      []
    ),
    updateElement: useCallback(
      (id, patch) => dispatch({ type: 'UPDATE_ELEMENT', id, patch }),
      []
    ),
    deleteElement: useCallback((id) => dispatch({ type: 'DELETE_ELEMENT', id }), []),
    reorder: useCallback((id, dir) => dispatch({ type: 'REORDER', id, dir }), []),
    select: useCallback((id) => dispatch({ type: 'SELECT', id }), []),
  };

  return <DocContext.Provider value={api}>{children}</DocContext.Provider>;
}

export function useDoc() {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error('useDoc fora do DocProvider');
  return ctx;
}
