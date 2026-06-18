// Minimal IndexedDB wrapper for saving documents in the browser.
const DB_NAME = 'gerador-relatorios';
const STORE = 'documentos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function saveDoc(doc) {
  const record = { ...doc, updatedAt: Date.now() };
  await tx('readwrite', (s) => s.put(record));
  return record;
}

export async function listDocs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => b.updatedAt - a.updatedAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDoc(id) {
  await tx('readwrite', (s) => s.delete(id));
}

// ---------- File System Access API (Chrome / Edge) ----------
export const fsSupported = 'showSaveFilePicker' in window;

export async function saveToFolder(doc) {
  if (!fsSupported) {
    // fallback: trigger a download
    downloadJSON(doc);
    return;
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: `${doc.name || 'documento'}.relatorio.json`,
    types: [{ description: 'Documento de Relatório', accept: { 'application/json': ['.json'] } }],
  });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(doc, null, 2));
  await writable.close();
}

export async function openFromFolder() {
  if (!fsSupported) return openJSONFallback();
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Documento de Relatório', accept: { 'application/json': ['.json'] } }],
  });
  const file = await handle.getFile();
  return JSON.parse(await file.text());
}

export function downloadJSON(doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name || 'documento'}.relatorio.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openJSONFallback() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(JSON.parse(reader.result));
      reader.readAsText(file);
    };
    input.click();
  });
}
