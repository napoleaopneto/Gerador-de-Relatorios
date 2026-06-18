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

function AlignPanel() {
  const { selectedElements, updateMany, checkpoint } = useDoc();
  const els = selectedElements;

  function align(kind) {
    checkpoint();
    const xs = els.map((e) => e.x);
    const ys = els.map((e) => e.y);
    const rs = els.map((e) => e.x + e.w);
    const bs = els.map((e) => e.y + e.h);
    const minX = Math.min(...xs), maxR = Math.max(...rs);
    const minY = Math.min(...ys), maxB = Math.max(...bs);
    const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2;
    const up = {};
    els.forEach((e) => {
      if (kind === 'left') up[e.id] = { x: minX };
      else if (kind === 'right') up[e.id] = { x: maxR - e.w };
      else if (kind === 'hcenter') up[e.id] = { x: Math.round(cx - e.w / 2) };
      else if (kind === 'top') up[e.id] = { y: minY };
      else if (kind === 'bottom') up[e.id] = { y: maxB - e.h };
      else if (kind === 'vcenter') up[e.id] = { y: Math.round(cy - e.h / 2) };
    });
    updateMany(up);
  }

  function distribute(axis) {
    if (els.length < 3) return;
    checkpoint();
    const key = axis === 'h' ? 'x' : 'y';
    const sorted = [...els].sort((a, b) => a[key] - b[key]);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const span = last[key] - first[key];
    const gap = span / (sorted.length - 1);
    const up = {};
    sorted.forEach((e, i) => {
      if (i > 0 && i < sorted.length - 1)
        up[e.id] = { [key]: Math.round(first[key] + gap * i) };
    });
    updateMany(up);
  }

  return (
    <div className="panel">
      <h3>{els.length} elementos</h3>
      <div className="field">
        <label>Alinhar</label>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => align('left')}>⬅</button>
          <button className="btn" onClick={() => align('hcenter')}>↔</button>
          <button className="btn" onClick={() => align('right')}>➡</button>
          <button className="btn" onClick={() => align('top')}>⬆</button>
          <button className="btn" onClick={() => align('vcenter')}>↕</button>
          <button className="btn" onClick={() => align('bottom')}>⬇</button>
        </div>
      </div>
      <div className="field">
        <label>Distribuir (3+)</label>
        <div className="row">
          <button className="btn" style={{ flex: 1 }} disabled={els.length < 3} onClick={() => distribute('h')}>
            Horizontal
          </button>
          <button className="btn" style={{ flex: 1 }} disabled={els.length < 3} onClick={() => distribute('v')}>
            Vertical
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPanel() {
  const { doc, selected, selectedIds, updateElement, deleteElement, duplicate, reorder, setMeta, checkpoint } =
    useDoc();

  if (selectedIds.length > 1) return <AlignPanel />;

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
      onFocus={checkpoint}
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

      {el.type === 'signature' && (
        <>
          <div className="field">
            <label>Nome / texto acima da linha</label>
            <input
              value={el.name || ''}
              onChange={(e) => updateElement(el.id, { name: e.target.value })}
              placeholder="Ex: {{cliente.nome}}"
            />
          </div>
          <div className="field">
            <label>Legenda</label>
            <input
              value={el.label || ''}
              onChange={(e) => updateElement(el.id, { label: e.target.value })}
            />
          </div>
        </>
      )}

      {el.type === 'qr' && (
        <div className="field">
          <label>Conteúdo do QR</label>
          <input
            value={el.value || ''}
            onChange={(e) => updateElement(el.id, { value: e.target.value })}
            placeholder="URL ou texto / {{variável}}"
          />
        </div>
      )}

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

      <button className="btn" style={{ width: '100%', marginBottom: 8 }} onClick={duplicate}>
        ⧉ Duplicar (Ctrl+D)
      </button>

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
