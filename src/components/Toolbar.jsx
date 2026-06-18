import { useCallback, useEffect, useRef, useState } from 'react';
import { FONTS } from '../model';

const DEFAULT_FMT = {
  font: 'Arial',
  size: 14,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  ul: false,
  ol: false,
  align: 'left',
};

// Text-align icons: 4 horizontal lines, the 2nd/3rd shortened and shifted to
// hint the alignment (left/center/right/justify).
function AlignIcon({ variant }) {
  const rows = {
    left: ['M3 4h18', 'M3 8h12', 'M3 12h18', 'M3 16h12'],
    center: ['M3 4h18', 'M6 8h12', 'M3 12h18', 'M6 16h12'],
    right: ['M3 4h18', 'M9 8h12', 'M3 12h18', 'M9 16h12'],
    justify: ['M3 4h18', 'M3 8h18', 'M3 12h18', 'M3 16h18'],
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {rows[variant].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function matchFont(name) {
  const hit = FONTS.find((f) => f.toLowerCase() === name.toLowerCase());
  return hit || name;
}

export default function Toolbar() {
  // Last caret/selection inside a text element (restored before each command).
  const saved = useRef(null);
  const [fmt, setFmt] = useState(DEFAULT_FMT);

  // Read the formatting state at the current caret and reflect it in the UI.
  const readFormat = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const elx = node && (node.nodeType === 1 ? node : node.parentElement);
    const host = elx?.closest?.('.el-text');
    if (!host) return;
    saved.current = { range: sel.getRangeAt(0).cloneRange(), host };

    try {
      const fontRaw = document.queryCommandValue('fontName') || '';
      const font = fontRaw.replace(/['"]/g, '').split(',')[0].trim() || 'Arial';
      const size = elx
        ? Math.round(parseFloat(getComputedStyle(elx).fontSize)) || 14
        : 14;
      const align = document.queryCommandState('justifyCenter')
        ? 'center'
        : document.queryCommandState('justifyRight')
        ? 'right'
        : document.queryCommandState('justifyFull')
        ? 'justify'
        : 'left';
      setFmt({
        font: matchFont(font),
        size,
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        align,
      });
    } catch {
      /* queryCommand may throw on detached selection */
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', readFormat);
    return () => document.removeEventListener('selectionchange', readFormat);
  }, [readFormat]);

  function restore() {
    const s = saved.current;
    if (!s || !s.host.isConnected) return false;
    s.host.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(s.range);
    return true;
  }

  function exec(cmd, value = null) {
    if (!restore()) return;
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, value);
    readFormat();
  }

  function setFontSize(px) {
    if (!restore()) return;
    // Force legacy <font size=7> tags (styleWithCSS off) so we can find and
    // rewrite them to the exact px below. exec() leaves styleWithCSS=true.
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    saved.current.host.querySelectorAll('font[size="7"]').forEach((f) => {
      f.removeAttribute('size');
      f.style.fontSize = px + 'px';
    });
    // execCommand committed the size-7 html via its own input event; our px
    // rewrite happens after, so fire input again to commit the final html.
    saved.current.host.dispatchEvent(new Event('input', { bubbles: true }));
    readFormat();
  }

  const hold = (e) => e.preventDefault();
  const act = (on) => `tbtn${on ? ' active' : ''}`;

  const fontOptions = FONTS.includes(fmt.font) ? FONTS : [fmt.font, ...FONTS];
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];
  const sizeOptions = SIZES.includes(fmt.size) ? SIZES : [fmt.size, ...SIZES];

  return (
    <div className="toolbar">
      <div className="group">
        <select
          title="Fonte"
          value={fmt.font}
          onChange={(e) => exec('fontName', e.target.value)}
          style={{ width: 130 }}
        >
          {fontOptions.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
        <select
          title="Tamanho"
          value={fmt.size}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ width: 64 }}
        >
          {sizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="group" onMouseDown={hold}>
        <button className={act(fmt.bold)} title="Negrito" onClick={() => exec('bold')}>
          <b>N</b>
        </button>
        <button className={act(fmt.italic)} title="Itálico" onClick={() => exec('italic')}>
          <i>I</i>
        </button>
        <button
          className={act(fmt.underline)}
          title="Sublinhado"
          onClick={() => exec('underline')}
        >
          <u>S</u>
        </button>
        <button
          className={act(fmt.strike)}
          title="Tachado"
          onClick={() => exec('strikeThrough')}
        >
          <s>T</s>
        </button>
      </div>

      <div className="group" onMouseDown={hold}>
        <label className="tbtn" title="Cor do texto" style={{ position: 'relative' }}>
          A
          <input
            type="color"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            onChange={(e) => exec('foreColor', e.target.value)}
          />
        </label>
        <label className="tbtn" title="Cor de fundo" style={{ position: 'relative' }}>
          🖌
          <input
            type="color"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            onChange={(e) => exec('hiliteColor', e.target.value)}
          />
        </label>
      </div>

      <div className="group" onMouseDown={hold}>
        <button
          className={act(fmt.align === 'left')}
          title="Alinhar à esquerda"
          onClick={() => exec('justifyLeft')}
        >
          <AlignIcon variant="left" />
        </button>
        <button
          className={act(fmt.align === 'center')}
          title="Centralizar"
          onClick={() => exec('justifyCenter')}
        >
          <AlignIcon variant="center" />
        </button>
        <button
          className={act(fmt.align === 'right')}
          title="Alinhar à direita"
          onClick={() => exec('justifyRight')}
        >
          <AlignIcon variant="right" />
        </button>
        <button
          className={act(fmt.align === 'justify')}
          title="Justificar"
          onClick={() => exec('justifyFull')}
        >
          <AlignIcon variant="justify" />
        </button>
      </div>

      <div className="group" onMouseDown={hold}>
        <button
          className={act(fmt.ul)}
          title="Lista com marcadores"
          onClick={() => exec('insertUnorderedList')}
        >
          • —
        </button>
        <button
          className={act(fmt.ol)}
          title="Lista numerada"
          onClick={() => exec('insertOrderedList')}
        >
          1.
        </button>
      </div>

      <div className="group" onMouseDown={hold}>
        <button className="tbtn" title="Limpar formatação" onClick={() => exec('removeFormat')}>
          ⌫
        </button>
      </div>
    </div>
  );
}
