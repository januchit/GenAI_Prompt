/* ============================================================
   Slide reader engine — PDF.js based
   ============================================================ */
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

/* ---- Slide deck catalogue ---- */
const BOOKS = {
  'chapter-1':  { file: 'slides/chapter-1.pdf',  title: 'บทที่ 1 · Generative AI Introduction' },
  'chapter-2':  { file: 'slides/chapter-2.pdf',  title: 'บทที่ 2 · Large Language Models' },
  'chapter-3':  { file: 'slides/chapter-3.pdf',  title: 'บทที่ 3 · How LLMs Work Internally' },
  'chapter-4':  { file: 'slides/chapter-4.pdf',  title: 'บทที่ 4 · Introduction to Prompt Engineering' },
  'chapter-5':  { file: 'slides/chapter-5.pdf',  title: 'บทที่ 5 · Basic Prompting Techniques' },
  'chapter-6':  { file: 'slides/chapter-6.pdf',  title: 'บทที่ 6 · Advanced Prompting Techniques I' },
  'chapter-7':  { file: 'slides/chapter-7.pdf',  title: 'บทที่ 7 · Advanced Prompting Techniques II' },
  'chapter-8':  { file: 'slides/chapter-8.pdf',  title: 'บทที่ 8 · Prompt Design for Specific Tasks' },
  'chapter-9':  { file: 'slides/chapter-9.pdf',  title: 'บทที่ 9 · Prompt Engineering for Code' },
  'chapter-10': { file: 'slides/chapter-10.pdf', title: 'บทที่ 10 · Retrieval-Augmented Generation' },
  'chapter-11': { file: 'slides/chapter-11.pdf', title: 'บทที่ 11 · Fine-tuning and LLM Customization' },
  'chapter-12': { file: 'slides/chapter-12.pdf', title: 'บทที่ 12 · AI Agents and Tool Use' },
  'chapter-13': { file: 'slides/chapter-13.pdf', title: 'บทที่ 13 · Ethics and Safety of Generative AI' },
};

/* ---- DOM ---- */
const $ = (id) => document.getElementById(id);
const spreadEl   = $('spread');
const stageEl    = $('stage');
const loaderEl   = $('loader');
const loaderText = $('loaderText');
const titleEl    = $('bookTitle');
const curEl      = $('pageCur');
const totalEl    = $('pageTotal');
const rangeEl    = $('pageRange');
const navPrev    = $('navPrev');
const navNext    = $('navNext');

/* ---- State ---- */
let pdfDoc = null;
let numPages = 0;
let spreadIndex = 0;       // 0-based; single slide per spread
let zoom = 1;
let rendering = false;
const pageCache = new Map(); // pageNum -> rendered canvas (at current layout)
let layoutKey = '';          // invalidates cache when size/zoom changes

/* ---- Boot ---- */
const params = new URLSearchParams(location.search);
const bookId = params.get('book') || 'chapter-1';
const book = BOOKS[bookId];

if (!book) {
  loaderText.textContent = 'ไม่พบสไลด์นี้';
} else {
  initBook();
}

async function initBook() {
  titleEl.textContent = book.title;
  document.title = book.title + ' — GenAI Course';
  $('btnDownload').href = book.file;

  try {
    const task = pdfjsLib.getDocument(book.file);
    task.onProgress = ({ loaded, total }) => {
      if (total) loaderText.textContent = `กำลังเปิดสไลด์… ${Math.round((loaded / total) * 100)}%`;
    };
    pdfDoc = await task.promise;
    numPages = pdfDoc.numPages;
    totalEl.textContent = numPages;
    rangeEl.max = numPages;
    spreadIndex = 0;
    await render();
    loaderEl.classList.add('hide');
  } catch (err) {
    console.error(err);
    loaderText.textContent = 'เปิดสไลด์ไม่สำเร็จ ลองรีเฟรชอีกครั้ง';
  }
}

/* ---- Rendering ---- */
async function renderPageCanvas(pageNum, fitScale) {
  const cacheId = `${pageNum}@${layoutKey}`;
  if (pageCache.has(cacheId)) return pageCache.get(cacheId);

  const page = await pdfDoc.getPage(pageNum);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: fitScale * dpr });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = (viewport.width / dpr) + 'px';
  canvas.style.height = (viewport.height / dpr) + 'px';

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  pageCache.set(cacheId, canvas);
  return canvas;
}

async function render() {
  if (!pdfDoc || rendering) return;
  rendering = true;

  const ref = await pdfDoc.getPage(1);
  const base = ref.getViewport({ scale: 1 });
  const availW = stageEl.clientWidth - 24;
  const availH = stageEl.clientHeight - 24;
  let fit = Math.min(availW / base.width, availH / base.height);
  fit = Math.max(fit, 0.2) * zoom;

  layoutKey = `${Math.round(fit * 1000)}`;

  const canvas = await renderPageCanvas(spreadIndex + 1, fit);

  spreadEl.innerHTML = '';
  const slot = document.createElement('div');
  slot.className = 'page-slot';
  slot.appendChild(canvas);
  spreadEl.appendChild(slot);

  updateChrome();
  rendering = false;
  prefetchNeighbors(fit);
}

function prefetchNeighbors(fit) {
  const first = spreadIndex + 1;
  [first + 1, first - 1].forEach((p) => {
    if (p >= 1 && p <= numPages) renderPageCanvas(p, fit).catch(() => {});
  });
}

function updateChrome() {
  const first = spreadIndex + 1;
  curEl.textContent = `${first}`;
  rangeEl.value = first;
  const atStart = spreadIndex <= 0;
  const atEnd = spreadIndex >= numPages - 1;
  navPrev.disabled = $('btnPrev').disabled = atStart;
  navNext.disabled = $('btnNext').disabled = atEnd;
}

/* ---- Navigation ---- */
function go(dir) {
  const next = Math.min(Math.max(spreadIndex + dir, 0), numPages - 1);
  if (next === spreadIndex) return;
  spreadIndex = next;
  spreadEl.classList.remove('flip-next', 'flip-prev');
  void spreadEl.offsetWidth; // reflow to restart animation
  spreadEl.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
  render();
}

function goToPage(p) {
  p = Math.min(Math.max(p, 1), numPages);
  spreadIndex = p - 1;
  render();
}

/* ---- Zoom ---- */
function setZoom(z) {
  zoom = Math.min(Math.max(z, 0.6), 2.4);
  pageCache.clear();
  render();
}

/* ---- Wire up controls ---- */
navPrev.onclick = $('btnPrev').onclick = () => go(-1);
navNext.onclick = $('btnNext').onclick = () => go(1);
$('btnZoomIn').onclick = () => setZoom(zoom + 0.2);
$('btnZoomOut').onclick = () => setZoom(zoom - 0.2);
rangeEl.oninput = (e) => goToPage(parseInt(e.target.value, 10));

$('btnFullscreen').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  else if (e.key === 'Home') goToPage(1);
  else if (e.key === 'End') goToPage(numPages);
  else if (e.key === '+' || e.key === '=') setZoom(zoom + 0.2);
  else if (e.key === '-') setZoom(zoom - 0.2);
  else if (e.key.toLowerCase() === 'f') $('btnFullscreen').click();
});

// Re-render on resize (debounced)
let rsTimer;
window.addEventListener('resize', () => {
  clearTimeout(rsTimer);
  rsTimer = setTimeout(() => {
    pageCache.clear();
    render();
  }, 180);
});

// Swipe on touch devices
let touchX = null;
stageEl.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
stageEl.addEventListener('touchend', (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  touchX = null;
});
