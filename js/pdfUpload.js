/* ==================================================================
   JEE CBT MAKER — PDF Upload & Render (PDF.js integration)
   ================================================================== */

/* ============ PDF.js CONFIG ============ */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

/* ==================================================================
   LOAD PDF — Called from app.js after file selection
   ================================================================== */
async function loadPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library not loaded');
  }

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  AppState.pdfDoc = pdf;
  AppState.totalPages = pdf.numPages;
  AppState.currentPage = 1;

  // Update UI
  const totalEl = document.getElementById('totalPages');
  if (totalEl) totalEl.textContent = pdf.numPages;

  const currentEl = document.getElementById('currentPage');
  if (currentEl) currentEl.textContent = '1';

  const fileNameEl = document.getElementById('cropFileName');
  if (fileNameEl) fileNameEl.textContent = file.name;

  console.log(`📄 PDF loaded: ${pdf.numPages} pages`);

  // Render first page
  await renderPdfPage(1);

  return pdf;
}

/* ==================================================================
   RENDER PDF PAGE — Draws page to canvas
   ================================================================== */
async function renderPdfPage(pageNum) {
  if (!AppState.pdfDoc) {
    console.warn('No PDF loaded');
    return;
  }

  if (pageNum < 1 || pageNum > AppState.totalPages) {
    console.warn('Invalid page number:', pageNum);
    return;
  }

  AppState.currentPage = pageNum;

  // Update UI counter
  const currentEl = document.getElementById('currentPage');
  if (currentEl) currentEl.textContent = pageNum;

  try {
    const page = await AppState.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: AppState.pdfScale });

    const canvas = document.getElementById('pdfCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // HiDPI support — sharper rendering
    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + 'px';
    canvas.style.height = Math.floor(viewport.height) + 'px';

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
    };

    await page.render(renderContext).promise;

    // Notify crop module that a new page is ready
    if (typeof onPdfPageRendered === 'function') {
      onPdfPageRendered(pageNum, canvas);
    }

    console.log(`📄 Rendered page ${pageNum}`);
  } catch (err) {
    console.error('Render error:', err);
    showInfoPopup('Page render nahi hua.', 'Error');
  }
}

/* ==================================================================
   PAGE NAVIGATION
   ================================================================== */
function nextPage() {
  if (!AppState.pdfDoc) return;
  if (AppState.currentPage < AppState.totalPages) {
    renderPdfPage(AppState.currentPage + 1);
  } else {
    showInfoPopup('Ye last page hai.', 'End');
  }
}

function prevPage() {
  if (!AppState.pdfDoc) return;
  if (AppState.currentPage > 1) {
    renderPdfPage(AppState.currentPage - 1);
  } else {
    showInfoPopup('Ye first page hai.', 'Start');
  }
}

function goToPage(n) {
  n = parseInt(n);
  if (isNaN(n)) return;
  if (n < 1) n = 1;
  if (n > AppState.totalPages) n = AppState.totalPages;
  renderPdfPage(n);
}

/* ==================================================================
   ZOOM CONTROLS
   ================================================================== */
function zoomIn() {
  if (AppState.pdfScale >= 3) return;
  AppState.pdfScale = Math.min(3, AppState.pdfScale + 0.25);
  renderPdfPage(AppState.currentPage);
}

function zoomOut() {
  if (AppState.pdfScale <= 0.75) return;
  AppState.pdfScale = Math.max(0.75, AppState.pdfScale - 0.25);
  renderPdfPage(AppState.currentPage);
}

function resetZoom() {
  AppState.pdfScale = 1.5;
  renderPdfPage(AppState.currentPage);
}

/* ==================================================================
   KEYBOARD SHORTCUTS — For faster navigation
   ================================================================== */
document.addEventListener('keydown', (e) => {
  // Only if crop screen is active
  if (AppState.currentScreen !== 'cropScreen') return;
  if (!AppState.pdfDoc) return;

  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case 'ArrowRight':
    case 'PageDown':
      nextPage();
      break;
    case 'ArrowLeft':
    case 'PageUp':
      prevPage();
      break;
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
    case '_':
      zoomOut();
      break;
    case '0':
      resetZoom();
      break;
  }
});

/* ==================================================================
   GET CANVAS DATA URL — For cropping (called from crop.js)
   ================================================================== */
function getCanvasDataUrl() {
  const canvas = document.getElementById('pdfCanvas');
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
}

/* ==================================================================
   EXTRACT CROP FROM CANVAS
   Coordinates are in canvas CSS-pixel space (viewport coords).
   ================================================================== */
function extractCropFromCanvas(x, y, width, height) {
  const canvas = document.getElementById('pdfCanvas');
  if (!canvas) {
    console.warn('No canvas');
    return null;
  }

  // HiDPI adjustment — canvas.width is in device pixels,
  // but x/y/w/h are in CSS pixels. Convert.
  const outputScale = canvas.width / parseFloat(canvas.style.width);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.floor(width * outputScale);
  cropCanvas.height = Math.floor(height * outputScale);

  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.drawImage(
    canvas,
    Math.floor(x * outputScale),
    Math.floor(y * outputScale),
    Math.floor(width * outputScale),
    Math.floor(height * outputScale),
    0, 0,
    cropCanvas.width,
    cropCanvas.height
  );

  return cropCanvas.toDataURL('image/png');
}

/* ==================================================================
   CLEANUP — Free PDF memory
   ================================================================== */
function unloadPdf() {
  if (AppState.pdfDoc) {
    AppState.pdfDoc.destroy();
    AppState.pdfDoc = null;
  }
  AppState.pdfFile = null;
  AppState.totalPages = 0;
  AppState.currentPage = 1;
  console.log('📄 PDF unloaded');
}
