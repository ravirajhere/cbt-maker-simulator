/* ==================================================================
   JEE CBT MAKER — Main Controller
   Screen switching, global state, popups, init
   ================================================================== */

/* ============ GLOBAL STATE ============ */
const AppState = {
  // Current screen
  currentScreen: 'homeScreen',

  // PDF data
  pdfFile: null,
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  pdfScale: 1.5,

  // Crops (each = one question)
  crops: [],           // [{id, imageData, subject, section, qNumber, ...}]

  // Current crop being made
  pendingCrop: null,   // {x, y, width, height} — pending selection

  // Current test config
  testConfig: {
    name: 'Untitled Test',
    duration: 180
  },

  // Active CBT test
  activeTest: null,

  // Current subject (CBT)
  currentSubject: 'Physics',
  currentQuestionIdx: 0,
  activeQuestions: [],

  // Timer
  timerInterval: null,
  timeLeft: 0,
  warned30: false
};

/* ==================================================================
   SCREEN SWITCHING
   ================================================================== */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    AppState.currentScreen = screenId;
  } else {
    console.error('Screen not found:', screenId);
  }
}

function goToHome() {
  showScreen('homeScreen');
  // Refresh saved list
  if (typeof loadSavedTestsList === 'function') {
    loadSavedTestsList();
  }
}

function goToCrop() {
  if (!AppState.pdfDoc) {
    showInfoPopup('Pehle PDF upload karo.', 'No PDF');
    return;
  }
  showScreen('cropScreen');
  if (typeof renderPdfPage === 'function') {
    renderPdfPage(AppState.currentPage);
  }
  updateCropSidePanel();
}

function goToReview() {
  if (AppState.crops.length === 0) {
    showInfoPopup('Koi crop nahi hua abhi. Pehle PDF se questions crop karo.', 'Empty');
    return;
  }
  showScreen('reviewScreen');
  if (typeof renderReviewList === 'function') {
    renderReviewList();
  }
}

function goToTestConfig() {
  if (AppState.crops.length === 0) {
    showInfoPopup('Pehle questions crop karo.', 'Empty');
    return;
  }
  // Validation: every crop should have an answer set
  const unanswered = AppState.crops.filter(c => c.answer === null || c.answer === undefined || c.answer === '');
  if (unanswered.length > 0) {
    showInfoPopup(
      `${unanswered.length} question(s) ka answer set nahi hua. Sabhi answers set karo.`,
      'Incomplete'
    );
    return;
  }

  showScreen('configScreen');
  updateConfigSummary();
}

function goToResult() {
  showScreen('resultScreen');
}

/* ==================================================================
   POPUP HELPERS
   ================================================================== */
function showInfoPopup(msg, title = 'Info') {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoMsg').innerHTML = msg;
  document.getElementById('infoPopup').classList.add('active');
}

function closeInfoPopup() {
  document.getElementById('infoPopup').classList.remove('active');
}

function showSubmitPopup(msg) {
  document.getElementById('submitMsg').innerHTML = msg;
  document.getElementById('submitPopup').classList.add('active');
}

function closePopup() {
  document.getElementById('submitPopup').classList.remove('active');
}

/* ==================================================================
   CROP SIDE PANEL UPDATE
   ================================================================== */
function updateCropSidePanel() {
  // Crop count
  const countEl = document.getElementById('cropCount');
  if (countEl) countEl.textContent = AppState.crops.length;

  // Recent crops
  const recent = document.getElementById('recentCrops');
  if (!recent) return;

  if (AppState.crops.length === 0) {
    recent.innerHTML = '<p class="empty-msg">Koi crop nahi hua abhi.</p>';
    return;
  }

  // Show last 4 crops
  const lastFew = AppState.crops.slice(-4).reverse();
  recent.innerHTML = lastFew.map((crop, i) => `
    <div class="recent-crop-item">
      <img src="${crop.imageData}" alt="Crop" />
      <div>${crop.subject.substring(0,3)} · ${crop.section === 'MCQ' ? 'MCQ' : 'Num'} · Q${crop.qNumber}</div>
    </div>
  `).join('');
}

/* ==================================================================
   CONFIG SUMMARY
   ================================================================== */
function updateConfigSummary() {
  const summary = document.getElementById('configSummary');
  if (!summary) return;

  const crops = AppState.crops;
  const bySubject = { Physics: 0, Chemistry: 0, Mathematics: 0 };
  const byType = { MCQ: 0, Numerical: 0 };

  crops.forEach(c => {
    bySubject[c.subject] = (bySubject[c.subject] || 0) + 1;
    byType[c.section] = (byType[c.section] || 0) + 1;
  });

  summary.innerHTML = `
    <div><strong>Total Questions:</strong> ${crops.length}</div>
    <div><strong>Physics:</strong> ${bySubject.Physics} · <strong>Chemistry:</strong> ${bySubject.Chemistry} · <strong>Mathematics:</strong> ${bySubject.Mathematics}</div>
    <div><strong>MCQ:</strong> ${byType.MCQ} · <strong>Numerical:</strong> ${byType.Numerical}</div>
  `;
}

/* ==================================================================
   FILE INPUT HANDLER (Home screen PDF upload)
   ================================================================== */
function setupFileUpload() {
  const fileInput = document.getElementById('pdfUpload');
  if (!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showInfoPopup('Sirf PDF file accept hoti hai.', 'Invalid file');
      return;
    }

    // Show file name
    const nameEl = document.getElementById('uploadedFileName');
    if (nameEl) nameEl.textContent = `📎 ${file.name}`;

    // Store in state
    AppState.pdfFile = file;

    // Load PDF using pdf.js (function in pdfUpload.js)
    if (typeof loadPdf === 'function') {
      try {
        await loadPdf(file);
        // Auto navigate to crop screen
        setTimeout(() => goToCrop(), 400);
      } catch (err) {
        console.error('PDF load error:', err);
        showInfoPopup('PDF load nahi hua. File corrupt ho sakti hai.', 'Error');
      }
    } else {
      showInfoPopup('PDF handler load nahi hua (pdfUpload.js missing).', 'Error');
    }
  });
}

/* ==================================================================
   INIT — Runs on page load
   ================================================================== */
async function initApp() {
  console.log('🚀 JEE CBT Maker initializing...');

  // 1. Init IndexedDB (storage.js)
  if (typeof initStorage === 'function') {
    try {
      await initStorage();
      console.log('✅ IndexedDB ready');
    } catch (err) {
      console.error('IndexedDB init failed:', err);
    }
  } else {
    console.warn('⚠️ storage.js not loaded — saves will not work');
  }

  // 2. Setup file upload listener
  setupFileUpload();

  // 3. Load saved tests list (if home screen visible)
  if (typeof loadSavedTestsList === 'function') {
    try {
      await loadSavedTestsList();
    } catch (err) {
      console.error('Failed to load saved tests:', err);
    }
  }

  // 4. Global keyboard shortcuts (optional — for testing)
  document.addEventListener('keydown', (e) => {
    // Esc closes popups
    if (e.key === 'Escape') {
      closeInfoPopup();
      closePopup();
    }
  });

  console.log('✅ App ready');
}

/* ==================================================================
   BOOT
   ================================================================== */
window.addEventListener('DOMContentLoaded', initApp);
