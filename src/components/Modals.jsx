import { useEffect, useMemo, useState } from 'react';
import { listDocs, deleteDoc, pickDatasetFile } from '../utils/storage';
import { collectVariables } from '../model';
import { useDoc } from '../store';
import { printMerge, exportMergeHTML } from '../utils/exporters';

// Fill / preview values for the {{variáveis}} used in the document.
export function VariablesModal({ onClose }) {
  const { doc, setMeta } = useDoc();
  const vars = useMemo(() => collectVariables(doc), [doc]);
  const values = doc.vars || {};

  const set = (k, v) => setMeta({ vars: { ...values, [k]: v } });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Variáveis do documento</h2>
        {vars.length === 0 ? (
          <p className="empty">
            Nenhuma variável encontrada. Use <b>{'{{nome}}'}</b> no texto, cabeçalho,
            assinatura ou QR. Campos automáticos: <b>{'{{data}}'}</b>, <b>{'{{hora}}'}</b>,{' '}
            <b>{'{{pagina}}'}</b>.
          </p>
        ) : (
          <>
            <p className="empty" style={{ marginBottom: 12 }}>
              Os valores preenchidos aparecem direto na página e nas exportações.
            </p>
            {vars.map((v) => (
              <div className="field" key={v}>
                <label>{`{{${v}}}`}</label>
                <input
                  value={values[v] || ''}
                  onChange={(e) => set(v, e.target.value)}
                  placeholder="(em branco mantém o token)"
                />
              </div>
            ))}
          </>
        )}
        <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

// Mail merge: load a CSV/JSON dataset and generate one document per row.
export function MergeModal({ onClose }) {
  const { doc } = useDoc();
  const [rows, setRows] = useState([]);
  const headers = rows.length ? Object.keys(rows[0]) : [];

  async function load() {
    const data = await pickDatasetFile();
    if (data) setRows(data);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: 620 }}>
        <h2>Mala-direta (gerar em lote)</h2>
        <p className="empty" style={{ marginBottom: 12 }}>
          Importe um <b>.csv</b> ou <b>.json</b>. Cada linha vira um documento, substituindo
          as variáveis <b>{'{{coluna}}'}</b> pelos valores da linha.
        </p>

        <button className="btn primary" onClick={load} style={{ marginBottom: 12 }}>
          📂 Importar dados (CSV / JSON)
        </button>

        {rows.length > 0 && (
          <>
            <div className="meta" style={{ marginBottom: 8 }}>
              {rows.length} registro(s) · colunas: {headers.join(', ')}
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>{headers.map((h) => <th key={h} style={{ borderBottom: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h} style={{ borderBottom: '1px solid var(--border)', padding: '6px 8px' }}>{String(r[h])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row">
              <button className="btn primary" style={{ flex: 1 }} onClick={() => printMerge(doc, rows)}>
                🖨 Imprimir / PDF (lote)
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => exportMergeHTML(doc, rows)}>
                🌐 Baixar HTML (lote)
              </button>
            </div>
          </>
        )}

        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

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
