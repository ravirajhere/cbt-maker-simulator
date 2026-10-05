/* ==================================================================
   JEE CBT MAKER — Crop Tool
   Drag-select on PDF canvas → save as image crop
   ================================================================== */

/* ============ LOCAL STATE (crop-specific) ============ */
const CropState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  selection: null,      // {x, y, width, height} in CSS pixels
  isActive: false,      // is crop tool active
  dragMode: 'create'    // 'create' | 'move' | 'resize'
};

/* ==================================================================
   INIT — Attach listeners to canvas
   Called once when app boots
   ================================================================== */
function initCropTool() {
  const canvas = document.getElementById('pdfCanvas');
  if (!canvas) {
    console.warn('Canvas not found — crop tool not initialized');
    return;
  }

  // Mouse events
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('mouseleave', onCanvasMouseUp);

  // Touch events
  canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
  canvas.addEventListener('touchend', onCanvasTouchEnd);

  // Prevent default drag behavior on canvas
  canvas.addEventListener('dragstart', (e) => e.preventDefault());

  console.log('✂️ Crop tool initialized');
}

/* ==================================================================
   ON PDF PAGE RENDERED — Reset crop on page change
   Called from pdfUpload.js
   ================================================================== */
function onPdfPageRendered(pageNum, canvas) {
  // Clear any pending selection
  clearSelection();
  console.log(`✂️ Crop reset for page ${pageNum}`);
}

/* ==================================================================
   MOUSE HANDLERS
   ================================================================== */
function onCanvasMouseDown(e) {
  if (AppState.currentScreen !== 'cropScreen') return;

  const pos = getMousePos(e);
  CropState.isDragging = true;
  CropState.isActive = true;
  CropState.startX = pos.x;
  CropState.startY = pos.y;
  CropState.currentX = pos.x;
  CropState.currentY = pos.y;

  updateOverlay(0, 0, 0, 0);
}

function onCanvasMouseMove(e) {
  if (!CropState.isDragging) return;
  const pos = getMousePos(e);
  CropState.currentX = pos.x;
  CropState.currentY = pos.y;
  updateOverlayFromDrag();
}

function onCanvasMouseUp(e) {
  if (!CropState.isDragging) return;
  CropState.isDragging = false;

  const sel = getSelectionFromDrag();

  if (sel.width < 20 || sel.height < 20) {
    // Too small — ignore
    clearSelection();
    return;
  }

  CropState.selection = sel;
  updateOverlay(sel.x, sel.y, sel.width, sel.height);

  // Enable save button
  const saveBtn = document.getElementById('saveCropBtn');
  if (saveBtn) saveBtn.disabled = false;
}

/* ==================================================================
   TOUCH HANDLERS
   ================================================================== */
function onCanvasTouchStart(e) {
  if (AppState.currentScreen !== 'cropScreen') return;
  if (e.touches.length !== 1) return;
  e.preventDefault();

  const pos = getTouchPos(e.touches[0]);
  CropState.isDragging = true;
  CropState.isActive = true;
  CropState.startX = pos.x;
  CropState.startY = pos.y;
  CropState.currentX = pos.x;
  CropState.currentY = pos.y;

  updateOverlay(0, 0, 0, 0);
}

function onCanvasTouchMove(e) {
  if (!CropState.isDragging) return;
  if (e.touches.length !== 1) return;
  e.preventDefault();

  const pos = getTouchPos(e.touches[0]);
  CropState.currentX = pos.x;
  CropState.currentY = pos.y;
  updateOverlayFromDrag();
}

function onCanvasTouchEnd(e) {
  if (!CropState.isDragging) return;
  CropState.isDragging = false;

  const sel = getSelectionFromDrag();

  if (sel.width < 20 || sel.height < 20) {
    clearSelection();
    return;
  }

  CropState.selection = sel;
  updateOverlay(sel.x, sel.y, sel.width, sel.height);

  const saveBtn = document.getElementById('saveCropBtn');
  if (saveBtn) saveBtn.disabled = false;
}

/* ==================================================================
   MOUSE / TOUCH POSITION HELPERS
   ================================================================== */
function getMousePos(e) {
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function getTouchPos(touch) {
  const canvas = document.getElementById('pdfCanvas');
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

/* ==================================================================
   SELECTION FROM DRAG — Normalized rect
   ================================================================== */
function getSelectionFromDrag() {
  const x = Math.min(CropState.startX, CropState.currentX);
  const y = Math.min(CropState.startY, CropState.currentY);
  const width = Math.abs(CropState.currentX - CropState.startX);
  const height = Math.abs(CropState.currentY - CropState.startY);
  return { x, y, width, height };
}

/* ==================================================================
   OVERLAY — Visual rectangle
   ================================================================== */
function updateOverlayFromDrag() {
  const sel = getSelectionFromDrag();
  updateOverlay(sel.x, sel.y, sel.width, sel.height);
}

function updateOverlay(x, y, width, height) {
  const overlay = document.getElementById('cropOverlay');
  if (!overlay) return;

  const canvas = document.getElementById('pdfCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  const viewerRect = canvas.parentElement.getBoundingClientRect();

  // Overlay coordinates relative to viewer (canvas parent)
  const offsetX = canvasRect.left - viewerRect.left;
  const offsetY = canvasRect.top - viewerRect.top;

  if (width === 0 && height === 0) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'block';
  overlay.style.left = (offsetX + x) + 'px';
  overlay.style.top = (offsetY + y) + 'px';
  overlay.style.width = width + 'px';
  overlay.style.height = height + 'px';
}

function clearSelection() {
  CropState.selection = null;
  CropState.isDragging = false;
  CropState.isActive = false;
  updateOverlay(0, 0, 0, 0);

  const saveBtn = document.getElementById('saveCropBtn');
  if (saveBtn) saveBtn.disabled = true;
}

/* ==================================================================
   SAVE CURRENT CROP — Called from "Save Crop" button
   ================================================================== */
async function saveCurrentCrop() {
  if (!CropState.selection) {
    showInfoPopup('Pehle PDF pe drag karke question select karo.', 'No selection');
    return;
  }

  const { x, y, width, height } = CropState.selection;

  // Get metadata from side panel
  const subject = document.getElementById('cropSubject')?.value || 'Physics';
  const section = document.getElementById('cropSection')?.value || 'MCQ';
  const qNumber = parseInt(document.getElementById('cropQNumber')?.value) || 1;

  // Extract crop image from canvas
  let imageData;
  try {
    imageData = extractCropFromCanvas(x, y, width, height);
    if (!imageData) throw new Error('Extraction failed');
  } catch (err) {
    console.error('Crop extract error:', err);
    showInfoPopup('Crop extract nahi hua.', 'Error');
    return;
  }

  // Generate unique ID
  const cropId = `crop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const crop = {
    id: cropId,
    imageData,
    subject,
    section,
    qNumber,
    answer: null,        // To be set in review screen
    pageNum: AppState.currentPage,
    createdAt: Date.now()
  };

  AppState.crops.push(crop);

  console.log(`✂️ Crop saved: ${subject} · ${section} · Q${qNumber}`);

  // Clear selection and reset UI
  clearSelection();

  // Auto-increment qNumber for next crop
  const qNumInput = document.getElementById('cropQNumber');
  if (qNumInput) {
    const maxQ = section === 'MCQ' ? 20 : 5;
    let nextQ = qNumber + 1;
    if (nextQ > maxQ) nextQ = 1;
    qNumInput.value = nextQ;
  }

  // Update side panel
  updateCropSidePanel();

  // Auto-save draft (optional but recommended)
  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(err => console.warn('Auto-save failed:', err));
  }

  // Small feedback
  showQuickToast('Crop saved ✅');
}

/* ==================================================================
   SHOW QUICK TOAST (small feedback)
   ================================================================== */
function showQuickToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #2e7d32;
    color: #fff;
    padding: 10px 22px;
    border-radius: 25px;
    font-size: 13px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: toastIn 0.3s ease;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

/* ==================================================================
   UNDO LAST CROP
   ================================================================== */
function undoLastCrop() {
  if (AppState.crops.length === 0) {
    showInfoPopup('Koi crop nahi hai undo karne ke liye.', 'Empty');
    return;
  }

  const removed = AppState.crops.pop();
  console.log(`↩️ Undo: removed ${removed.id}`);
  updateCropSidePanel();

  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(() => {});
  }

  showQuickToast('Last crop removed ↩️');
}

/* ==================================================================
   DELETE A SPECIFIC CROP
   ================================================================== */
function deleteCrop(cropId) {
  const idx = AppState.crops.findIndex(c => c.id === cropId);
  if (idx === -1) return;

  AppState.crops.splice(idx, 1);
  updateCropSidePanel();

  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(() => {});
  }
}

/* ==================================================================
   INIT ON LOAD
   ================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // Delay init so canvas exists
  setTimeout(initCropTool, 100);
});

/* ==================================================================
   KEYBOARD: Delete to clear selection, Ctrl+Z to undo
   ================================================================== */
document.addEventListener('keydown', (e) => {
  if (AppState.currentScreen !== 'cropScreen') return;

  // Escape → clear current selection
  if (e.key === 'Escape') {
    clearSelection();
  }

  // Ctrl+Z → undo last crop
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLastCrop();
  }

  // Enter → save current crop (if selection exists)
  if (e.key === 'Enter' && CropState.selection) {
    e.preventDefault();
    saveCurrentCrop();
  }
});
