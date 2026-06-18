import { useDoc } from '../store';

const isTable = (el) => el?.type === 'text' && /<table/i.test(el.html || '');

// Parse table html, run mutator on the <table> node, return serialized html.
function editTable(html, fn) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const table = dom.querySelector('table');
  if (!table) return html;
  fn(table);
  return table.outerHTML;
}

function tableSize(html) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const table = dom.querySelector('table');
  if (!table) return { rows: 0, cols: 0 };
  const headCols = table.querySelectorAll('thead tr:first-child > *').length;
  const firstBody = table.querySelector('tbody tr');
  const bodyCols = firstBody ? firstBody.children.length : 0;
  const bodyRows = table.querySelectorAll('tbody tr').length;
  return { rows: bodyRows + 1, cols: Math.max(headCols, bodyCols) };
}

export default function PropertiesPanel() {
  const { doc, selected, updateElement, deleteElement, reorder, setMeta } = useDoc();

  if (!selected) {
    return (
      <div className="panel">
        <h3>Documento</h3>
        <div className="field">
          <label>Tamanho da página</label>
          <select
            value={doc.pageSize}
            onChange={(e) => setMeta({ pageSize: e.target.value })}
          >
            <option value="A4">A4 (retrato)</option>
            <option value="Paisagem">A4 (paisagem)</option>
            <option value="A5">A5</option>
            <option value="Carta">Carta</option>
          </select>
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={doc.showHeader}
              onChange={(e) => setMeta({ showHeader: e.target.checked })}
              style={{ width: 'auto', marginRight: 6 }}
            />
            Cabeçalho
          </label>
          {doc.showHeader && (
            <input
              value={doc.headerText}
              onChange={(e) => setMeta({ headerText: e.target.value })}
            />
          )}
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={doc.showFooter}
              onChange={(e) => setMeta({ showFooter: e.target.checked })}
              style={{ width: 'auto', marginRight: 6 }}
            />
            Rodapé
          </label>
          {doc.showFooter && (
            <input
              value={doc.footerText}
              onChange={(e) => setMeta({ footerText: e.target.value })}
            />
          )}
          <p className="empty" style={{ marginTop: 6 }}>
            Use <b>{'{{pagina}}'}</b> para numerar.
          </p>
        </div>

        <p className="empty">
          Selecione um elemento na página para editar posição, tamanho e estilo.
        </p>
      </div>
    );
  }

  const el = selected;
  const num = (k) => (
    <input
      type="number"
      value={Math.round(el[k])}
      onChange={(e) => updateElement(el.id, { [k]: Number(e.target.value) })}
    />
  );

  return (
    <div className="panel">
      <h3>Elemento ({el.type})</h3>

      <div className="field row">
        <div style={{ flex: 1 }}>
          <label>X</label>
          {num('x')}
        </div>
        <div style={{ flex: 1 }}>
          <label>Y</label>
          {num('y')}
        </div>
      </div>
      <div className="field row">
        <div style={{ flex: 1 }}>
          <label>Largura</label>
          {num('w')}
        </div>
        <div style={{ flex: 1 }}>
          <label>Altura</label>
          {num('h')}
        </div>
      </div>
      <div className="field">
        <label>Rotação ({el.rotation || 0}°)</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={el.rotation || 0}
          onChange={(e) => updateElement(el.id, { rotation: Number(e.target.value) })}
        />
      </div>

      {isTable(el) && (() => {
        const { rows, cols } = tableSize(el.html);
        const apply = (fn) => updateElement(el.id, { html: editTable(el.html, fn) });

        const addRow = () =>
          apply((t) => {
            const tbody = t.querySelector('tbody') || t;
            const tr = document.createElement('tr');
            for (let i = 0; i < cols; i++) {
              const td = document.createElement('td');
              td.innerHTML = '&nbsp;';
              tr.appendChild(td);
            }
            tbody.appendChild(tr);
          });
        const delRow = () =>
          apply((t) => {
            const trs = t.querySelectorAll('tbody tr');
            if (trs.length > 0) trs[trs.length - 1].remove();
          });
        const addCol = () =>
          apply((t) => {
            t.querySelectorAll('thead tr').forEach((tr) => {
              const th = document.createElement('th');
              th.textContent = `Coluna ${cols + 1}`;
              tr.appendChild(th);
            });
            t.querySelectorAll('tbody tr').forEach((tr) => {
              const td = document.createElement('td');
              td.innerHTML = '&nbsp;';
              tr.appendChild(td);
            });
          });
        const delCol = () =>
          apply((t) => {
            if (cols <= 1) return;
            t.querySelectorAll('tr').forEach((tr) => {
              if (tr.lastElementChild) tr.lastElementChild.remove();
            });
          });

        return (
          <>
            <h3 style={{ marginTop: 8 }}>Tabela</h3>
            <div className="field">
              <label>Linhas ({rows})</label>
              <div className="row">
                <button className="btn" style={{ flex: 1 }} onClick={addRow}>+ Linha</button>
                <button className="btn" style={{ flex: 1 }} onClick={delRow} disabled={rows <= 1}>− Linha</button>
              </div>
            </div>
            <div className="field">
              <label>Colunas ({cols})</label>
              <div className="row">
                <button className="btn" style={{ flex: 1 }} onClick={addCol}>+ Coluna</button>
                <button className="btn" style={{ flex: 1 }} onClick={delCol} disabled={cols <= 1}>− Coluna</button>
              </div>
            </div>
          </>
        );
      })()}

      {el.type === 'shape' && (
        <>
          <div className="field">
            <label>Preenchimento</label>
            <input
              type="color"
              value={el.fill === 'transparent' ? '#ffffff' : el.fill}
              onChange={(e) => updateElement(el.id, { fill: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Borda</label>
            <input
              type="color"
              value={el.stroke}
              onChange={(e) => updateElement(el.id, { stroke: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Espessura da borda</label>
            <input
              type="number"
              value={el.strokeWidth}
              min="0"
              onChange={(e) => updateElement(el.id, { strokeWidth: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      <div className="field row">
        <button className="btn" style={{ flex: 1 }} onClick={() => reorder(el.id, 'front')}>
          ⤴ Frente
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={() => reorder(el.id, 'back')}>
          ⤵ Trás
        </button>
      </div>

      <button
        className="btn"
        style={{ width: '100%', color: 'var(--danger)' }}
        onClick={() => deleteElement(el.id)}
      >
        🗑 Excluir elemento
      </button>
    </div>
  );
}
