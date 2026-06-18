import { useEffect, useState } from 'react';
import { DocProvider, useDoc } from './store';
import { newDocument } from './model';
import Toolbar from './components/Toolbar';
import LeftRail from './components/LeftRail';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import { DocsModal } from './components/Modals';
import {
  saveDoc,
  saveToFolder,
  openFromFolder,
  downloadJSON,
} from './utils/storage';
import { exportPDF, exportPNG, exportHTML, exportDOCX, openPreview } from './utils/exporters';

function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('tema') || 'light'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tema', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))];
}

function Shell() {
  const { doc, load, setMeta } = useDoc();
  const [theme, toggleTheme] = useTheme();
  const [exportOpen, setExportOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [busy, setBusy] = useState('');

  async function runExport(fn, label) {
    setExportOpen(false);
    setBusy(`Exportando ${label}...`);
    try {
      await fn(doc);
    } catch (err) {
      alert('Erro ao exportar: ' + err.message);
    }
    setBusy('');
  }

  async function onSaveBrowser() {
    await saveDoc(doc);
    setBusy('Salvo no navegador ✓');
    setTimeout(() => setBusy(''), 1500);
  }

  async function onOpenFolder() {
    try {
      const d = await openFromFolder();
      if (d) load(d);
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">📄 Gerador de Relatórios</span>
        <input
          className="doc-name"
          value={doc.name}
          onChange={(e) => setMeta({ name: e.target.value })}
        />
        <span className="spacer" />
        {busy && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{busy}</span>}

        <button className="btn" onClick={() => load(newDocument())}>
          Novo
        </button>
        <button className="btn" onClick={() => setDocsOpen(true)}>
          Abrir
        </button>
        <button className="btn" onClick={onOpenFolder} title="Abrir arquivo .json do PC">
          📁 Pasta
        </button>
        <button className="btn primary" onClick={onSaveBrowser}>
          💾 Salvar
        </button>
        <button className="btn" onClick={() => saveToFolder(doc)} title="Salvar como arquivo no PC">
          Salvar p/ PC
        </button>

        <button className="btn" onClick={() => openPreview(doc)} title="Abrir impressão, separado por página">
          🖨 Imprimir
        </button>

        <div className="dropdown">
          <button className="btn" onClick={() => setExportOpen((o) => !o)}>
            ⬇ Exportar
          </button>
          {exportOpen && (
            <div className="dropdown-menu" onMouseLeave={() => setExportOpen(false)}>
              <button onClick={() => runExport(exportPDF, 'PDF')}>📕 PDF</button>
              <button onClick={() => runExport(exportPNG, 'PNG')}>🖼 Imagem (PNG)</button>
              <button onClick={() => runExport(exportHTML, 'HTML')}>🌐 HTML</button>
              <button onClick={() => runExport(exportDOCX, 'Word')}>📘 Word (DOCX)</button>
              <button onClick={() => downloadJSON(doc)}>💾 JSON (rascunho)</button>
            </div>
          )}
        </div>

        <button className="btn icon" onClick={toggleTheme} title="Alternar tema">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <Toolbar />

      <div className="body">
        <LeftRail />
        <Canvas />
        <PropertiesPanel />
      </div>

      {docsOpen && <DocsModal onClose={() => setDocsOpen(false)} onPick={load} />}
    </div>
  );
}

export default function App() {
  return (
    <DocProvider>
      <Shell />
    </DocProvider>
  );
}
