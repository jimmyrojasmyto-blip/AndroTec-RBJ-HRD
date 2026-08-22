import { Viewer3D } from "./viewer.js";

const state = {
  data: null,
  models: [],
  filtered: [],
  filter: "Todos",
  search: "",
  selectedIndex: 0,
  compareOn: false,
};

const el = (id) => document.getElementById(id);

const specimenList = el("specimenList");
const modelCountEl = el("modelCount");
const searchInput = el("searchInput");
const filterRow = el("filterRow");
const catalogPanel = el("catalogPanel");
const catalogTrigger = el("catalogTrigger");

const objIndex = el("objIndex");
const objTitle = el("objTitle");
const compareBtn = el("compareBtn");
const viewerLayout = el("viewerLayout");
const cellCompare = el("cellCompare");
const loadingPrimary = el("loadingPrimary");

const categoryIcon = el("categoryIcon");
const categoryLabel = el("categoryLabel");
const infoTitle = el("infoTitle");
const infoRegion = el("infoRegion");
const infoDescripcion = el("infoDescripcion");
const infoObservar = el("infoObservar");
const infoImportancia = el("infoImportancia");
const refCount = el("refCount");
const refList = el("refList");
const figCount = el("figCount");
const figList = el("figList");
const interpretationText = el("interpretationText");

let primaryViewer = null;
let compareViewer = null;

async function init() {
  const res = await fetch("data/models.json");
  state.data = await res.json();
  state.models = state.data.modelos;
  interpretationText.textContent = state.data.interpretacionResponsable;

  primaryViewer = new Viewer3D(document.getElementById("viewerPrimary"));

  applyFilters();
  selectByIndex(0, { skipCatalogClose: true });

  wireEvents();
}

function applyFilters() {
  const term = state.search.trim().toLowerCase();
  state.filtered = state.models.filter((m) => {
    const matchesFilter = state.filter === "Todos" || m.categoria === state.filter;
    const matchesSearch =
      !term ||
      m.titulo.toLowerCase().includes(term) ||
      m.region.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });
  renderList();
}

function renderList() {
  modelCountEl.textContent = state.models.length;
  specimenList.innerHTML = "";

  if (state.filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "specimen-empty";
    empty.textContent = "Sin resultados para esta búsqueda.";
    specimenList.appendChild(empty);
    return;
  }

  const currentId = state.models[state.selectedIndex]?.id;

  for (const model of state.filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "specimen-item" + (model.id === currentId ? " selected" : "");
    btn.innerHTML = `
      <span class="specimen-number">${model.numero}</span>
      <span class="specimen-copy">
        <strong>${model.titulo}</strong>
        <small>${model.region}</small>
      </span>
      <span class="specimen-arrow" aria-hidden="true">›</span>
    `;
    btn.addEventListener("click", () => {
      const idx = state.models.findIndex((m) => m.id === model.id);
      selectByIndex(idx);
    });
    specimenList.appendChild(btn);
  }
}

async function selectByIndex(index, opts = {}) {
  if (index < 0 || index >= state.models.length) return;
  state.selectedIndex = index;
  const model = state.models[index];

  objIndex.textContent = model.numero;
  objTitle.textContent = model.titulo;
  document.title = `${model.titulo} — ANDROTEC Museo 3D`;

  categoryLabel.textContent = model.categoria;
  categoryIcon.dataset.category = model.categoria;
  categoryIcon.textContent = model.categoria === "Referencia" ? "✓" : "●";
  infoTitle.textContent = model.titulo;
  infoRegion.textContent = model.region;
  infoDescripcion.textContent = model.descripcion;
  infoObservar.textContent = model.queObservar;
  infoImportancia.textContent = model.importanciaFuncional;

  refCount.textContent = model.referencias.length;
  refList.innerHTML = model.referencias
    .map(
      (r) => `<li><p>${escapeHtml(r.texto)}</p><a href="${r.href}" target="_blank" rel="noreferrer">Abrir fuente <span aria-hidden="true">↗</span></a></li>`
    )
    .join("");

  figCount.textContent = model.figuras.length;
  figList.innerHTML = model.figuras
    .map(
      (f) => `<li><a href="${f.href}" target="_blank" rel="noreferrer"><strong>${escapeHtml(f.titulo)}</strong><small>${escapeHtml(f.fuente)}</small><span aria-hidden="true">Abrir figura ↗</span></a></li>`
    )
    .join("");

  compareBtn.disabled = model.numero === "00";
  compareBtn.title = model.numero === "00" ? "Selecciona un defecto" : "Comparar con el modelo normal";
  if (model.numero === "00" && state.compareOn) {
    setCompare(false);
  }

  renderList();

  loadingPrimary.classList.remove("hidden");
  try {
    await primaryViewer.loadModel(model.archivo);
  } finally {
    loadingPrimary.classList.add("hidden");
  }

  if (state.compareOn && compareViewer) {
    const normal = state.models.find((m) => m.numero === "00");
    await compareViewer.loadModel(normal.archivo);
  }

  if (!opts.skipCatalogClose) closeCatalogDrawer();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setCompare(on) {
  state.compareOn = on;
  cellCompare.hidden = !on;
  viewerLayout.classList.toggle("compare", on);
  compareBtn.classList.toggle("active", on);

  if (on && !compareViewer) {
    compareViewer = new Viewer3D(document.getElementById("viewerCompare"));
  }
  if (on) {
    const normal = state.models.find((m) => m.numero === "00");
    compareViewer.loadModel(normal.archivo);
  }

  // El grid pasa de una columna a dos (o viceversa): ambos visores deben
  // recalcular su tamaño una vez que el navegador termine de reacomodar el
  // layout, si no, el que estaba oculto queda renderizando en 0×0.
  primaryViewer.refreshSize();
  if (compareViewer) compareViewer.refreshSize();
}

function closeCatalogDrawer() {
  catalogPanel.classList.remove("open");
  catalogTrigger.setAttribute("aria-expanded", "false");
}

function wireEvents() {
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    applyFilters();
  });

  filterRow.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    [...filterRow.querySelectorAll("button")].forEach((b) => b.classList.toggle("active", b === btn));
    applyFilters();
  });

  catalogTrigger.addEventListener("click", () => {
    const isOpen = catalogPanel.classList.toggle("open");
    catalogTrigger.setAttribute("aria-expanded", String(isOpen));
    primaryViewer.refreshSize();
    if (compareViewer) compareViewer.refreshSize();
  });

  document.addEventListener("fullscreenchange", () => {
    primaryViewer.refreshSize();
    if (compareViewer) compareViewer.refreshSize();
  });

  compareBtn.addEventListener("click", () => setCompare(!state.compareOn));

  document.querySelectorAll("#viewerPrimary .model-controls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "zoomin") primaryViewer.zoom(0.8);
      if (action === "zoomout") primaryViewer.zoom(1.25);
      if (action === "reset") primaryViewer.resetView();
      if (action === "autorotate") {
        const on = primaryViewer.toggleAutoRotate();
        btn.classList.toggle("active", on);
      }
      if (action === "fullscreen") {
        const stage = document.querySelector(".viewer-stage");
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          stage.requestFullscreen?.();
        }
      }
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowRight") selectByIndex(Math.min(state.selectedIndex + 1, state.models.length - 1));
    if (e.key === "ArrowLeft") selectByIndex(Math.max(state.selectedIndex - 1, 0));
  });
}

init();
