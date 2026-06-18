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

// ---------- Dataset (mail merge) ----------
// Parse JSON (array of objects) or CSV text into an array of flat row objects.
export function parseDataset(text, filename = '') {
  const trimmed = text.trim();
  if (filename.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    return Array.isArray(data) ? data : [data];
  }
  return parseCSV(trimmed);
}

// Minimal CSV parser: handles quoted fields, commas/semicolons, escaped quotes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const delim = (text.split('\n')[0].match(/;/g) || []).length >
    (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function pickDatasetFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,text/csv,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseDataset(reader.result, file.name.toLowerCase()));
        } catch (err) {
          alert('Falha ao ler dados: ' + err.message);
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
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
