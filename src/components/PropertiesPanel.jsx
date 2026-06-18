import { useDoc } from '../store';

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
