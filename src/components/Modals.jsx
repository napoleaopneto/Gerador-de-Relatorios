import { useEffect, useState } from 'react';
import { listDocs, deleteDoc } from '../utils/storage';

export function DocsModal({ onClose, onPick }) {
  const [tab, setTab] = useState('salvos');
  const [saved, setSaved] = useState([]);
  const [examples, setExamples] = useState([]);

  async function refresh() {
    setSaved(await listDocs());
  }

  useEffect(() => {
    refresh();
    fetch('/documentos/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  async function openExample(file) {
    const r = await fetch(`/documentos/${file}`);
    const doc = await r.json();
    // give a fresh id so saving doesn't overwrite the example
    onPick({ ...doc, id: crypto.randomUUID() });
    onClose();
  }

  function fmt(ts) {
    return new Date(ts).toLocaleString('pt-BR');
  }

  const list = tab === 'salvos' ? saved : examples;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Abrir documento</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            className={`btn ${tab === 'salvos' ? 'primary' : ''}`}
            onClick={() => setTab('salvos')}
          >
            Salvos no navegador
          </button>
          <button
            className={`btn ${tab === 'exemplos' ? 'primary' : ''}`}
            onClick={() => setTab('exemplos')}
          >
            Exemplos
          </button>
        </div>

        {list.length === 0 && (
          <p className="empty">
            {tab === 'salvos'
              ? 'Nenhum documento salvo ainda. Use 💾 Salvar.'
              : 'Nenhum exemplo encontrado.'}
          </p>
        )}

        {list.map((d) =>
          tab === 'salvos' ? (
            <div className="doc-list-item" key={d.id}>
              <div className="info">
                <div className="name">{d.name}</div>
                <div className="meta">
                  {(d.elements || []).length} elemento(s) · {fmt(d.updatedAt)}
                </div>
              </div>
              <button
                className="btn"
                onClick={() => {
                  onPick(d);
                  onClose();
                }}
              >
                Abrir
              </button>
              <button
                className="btn"
                style={{ color: 'var(--danger)' }}
                onClick={async () => {
                  await deleteDoc(d.id);
                  refresh();
                }}
              >
                🗑
              </button>
            </div>
          ) : (
            <div className="doc-list-item" key={d.file}>
              <div className="info">
                <div className="name">{d.name}</div>
                <div className="meta">{d.description}</div>
              </div>
              <button className="btn" onClick={() => openExample(d.file)}>
                Usar
              </button>
            </div>
          )
        )}

        <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
