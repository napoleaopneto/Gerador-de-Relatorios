# 📄 Gerador de Relatórios

Editor de documentos visual (drag-and-drop) em **React + Vite**. Monte contratos, relatórios e modelos numa folha A4, com elementos posicionados livremente, e exporte para PDF, PNG, HTML ou Word. Tudo roda no navegador — sem backend.

---

## ✨ Funcionalidades

### Edição de documento
- **Folha visual** com tamanhos A4 (retrato), A4 (paisagem), A5 e Carta.
- **Paginação automática** — a folha cresce em páginas conforme os elementos descem.
- **Cabeçalho / rodapé** opcionais, com numeração via `{{pagina}}`.
- **Cabeçalho e rodapé por página** na impressão.

### Elementos
| Elemento | Descrição |
|----------|-----------|
| **Texto** | Caixa rich-text editável (duplo clique). Cresce/encolhe no tamanho exato do conteúdo. |
| **Imagem** | Upload do PC, redimensionada automaticamente (máx. 360px de largura ao inserir). |
| **Tabela** | Tabela 3×3 inicial (editável como texto). |
| **Retângulo / Elipse / Linha** | Formas vetoriais (SVG) com preenchimento, borda e espessura. |
| **Variável** | Placeholder `{{nome}}` destacado, para mala-direta / preenchimento posterior. |

Cada elemento suporta **mover, redimensionar, rotacionar** (−180° a 180°), ordenar (frente/trás) e excluir.

### Formatação de texto (toolbar)
- Fonte (9 famílias) e tamanho (8–64px).
- **Negrito**, *itálico*, <u>sublinhado</u>, ~~tachado~~.
- Cor do texto e cor de fundo (realce).
- Alinhamento: esquerda, centro, direita, justificado (ícones SVG).
- Listas com marcadores e numeradas.
- Limpar formatação.

### Variáveis / templates
- Sintaxe `{{Grupo.campo}}` (ex.: `{{Empresa.razao_social}}`), destacada em amarelo no editor.
- Ideal para modelos reaproveitáveis (contratos, propostas).

### Salvar / abrir
- **Salvar no navegador** (IndexedDB) — lista de documentos com data e contagem de elementos.
- **Salvar para o PC** / **Abrir do PC** via File System Access API (Chrome/Edge), com fallback de download/upload `.json`.
- **Exemplos** carregados de `/public/documentos/index.json`.
- Migração automática de documentos antigos (formato `pages[]` → `elements[]`).

### Exportar / imprimir
| Formato | Como funciona |
|---------|---------------|
| **PDF** | Snapshot via html2canvas → fatiado por página → jsPDF. |
| **PNG** | Uma imagem por página. |
| **HTML** | Documento standalone autocontido. |
| **Word (DOCX)** | Layout achatado em conteúdo empilhado (texto/tabelas/imagens). |
| **JSON** | Rascunho editável (reabrível no app). |
| **🖨 Imprimir** | Renderiza HTML paginado num iframe oculto e abre o diálogo de impressão — sem aba em branco, uma quebra de página real por página. |

### Outros
- Tema **claro / escuro** (persistido em `localStorage`).
- Nome do documento editável no topo.

---

## 🚀 Instalação

Requisitos: **Node.js 18+**.

```bash
# instalar dependências
npm install

# rodar em desenvolvimento (http://localhost:5173)
npm run dev

# build de produção (gera dist/)
npm run build

# pré-visualizar o build
npm run preview

# lint
npm run lint
```

---

## 🧱 Stack

- **React 19** + **Vite 8**
- **jspdf** + **html2canvas** — exportação PDF/PNG
- **html-docx-js-typescript** — exportação Word
- **uuid** — IDs de documento/elemento
- Armazenamento: **IndexedDB** + **File System Access API**

---

## 📂 Estrutura

```
src/
├── App.jsx                 # shell: topbar, layout, ações (salvar/exportar/imprimir)
├── main.jsx                # bootstrap React
├── model.js                # fábricas de elementos, PAGE_SIZES, FONTS, paginação
├── store.jsx               # estado global (Context + useReducer)
├── components/
│   ├── Toolbar.jsx         # formatação rich-text + ícones de alinhamento
│   ├── LeftRail.jsx        # inserir elementos (texto/imagem/tabela/formas/variável)
│   ├── Canvas.jsx          # folha + render dos elementos
│   ├── Frame.jsx           # moldura de seleção (mover/redimensionar/rotacionar)
│   ├── Elements.jsx        # renderizadores de texto/imagem/forma
│   ├── PropertiesPanel.jsx # painel: página, cabeçalho/rodapé, props do elemento
│   └── Modals.jsx          # modal Abrir (salvos no navegador / exemplos)
└── utils/
    ├── exporters.js        # PDF, PNG, HTML, DOCX, impressão paginada
    └── storage.js          # IndexedDB + File System Access + download/upload JSON
```

### Modelo de dados (documento)

```js
{
  id, name,
  pageSize: 'A4' | 'A5' | 'Carta' | 'Paisagem',
  showHeader, showFooter, headerText, footerText,  // {{pagina}} no rodapé
  elements: [
    // texto/tabela
    { id, type: 'text', x, y, w, h, rotation, html },
    // imagem
    { id, type: 'image', x, y, w, h, rotation, src },
    // forma
    { id, type: 'shape', shape: 'rect'|'ellipse'|'line',
      x, y, w, h, rotation, fill, stroke, strokeWidth },
  ],
  updatedAt,
}
```

---

## 📝 Exemplos

Coloque modelos em `public/documentos/` e liste-os em `public/documentos/index.json`:

```json
[
  { "file": "contrato.relatorio.json", "name": "Contrato", "description": "Modelo de contrato" }
]
```

Aparecem na aba **Exemplos** do modal *Abrir*. Ao usar, recebem novo `id` (não sobrescrevem o original).

---

## ⚠️ Notas

- **Imprimir / pop-ups**: a impressão usa iframe oculto; HTML/PDF standalone podem exigir permissão de pop-up.
- **File System Access API** só em navegadores baseados em Chromium (Chrome/Edge); demais usam download/upload `.json`.
- Tudo é **client-side** — nenhum dado sai do navegador.
# Gerador-de-Relatorios
