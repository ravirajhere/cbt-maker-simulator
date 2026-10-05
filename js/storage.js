/* ==================================================================
   JEE CBT MAKER — IndexedDB Storage Layer
   Saves tests, crops, answers locally in browser
   ================================================================== */

const DB_NAME = 'JeeCbtMaker';
const DB_VERSION = 1;
const STORE_TESTS = 'tests';

let db = null;

/* ==================================================================
   INIT — Open IndexedDB
   ================================================================== */
function initStorage() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create tests store
      if (!database.objectStoreNames.contains(STORE_TESTS)) {
        const store = database.createObjectStore(STORE_TESTS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/* ==================================================================
   GENERATE UNIQUE ID
   ================================================================== */
function generateId(prefix = 'test') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ==================================================================
   SAVE TEST — From current AppState
   ================================================================== */
async function saveTestToLocal() {
  if (!db) await initStorage();

  const crops = AppState.crops;

  if (crops.length === 0) {
    showInfoPopup('Koi crop nahi hai. Pehle questions crop karo.', 'Empty');
    return;
  }

  const testName = (document.getElementById('configTestName')?.value || '').trim() || 'Untitled Test';
  const duration = parseInt(document.getElementById('configDuration')?.value) || 180;

  const testId = AppState.testConfig.id || generateId('test');

  // Prepare crops with images as dataURLs (already are, but ensure)
  const serializedCrops = crops.map(c => ({
    id: c.id,
    imageData: c.imageData,       // base64 dataURL
    subject: c.subject,
    section: c.section,           // 'MCQ' | 'Numerical'
    qNumber: c.qNumber,
    answer: c.answer              // number (1-based) for MCQ, string for Numerical
  }));

  const test = {
    id: testId,
    name: testName,
    duration: duration,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    crops: serializedCrops
  };

  try {
    await idbPut(STORE_TESTS, test);
    AppState.testConfig.id = testId;
    AppState.testConfig.name = testName;
    AppState.testConfig.duration = duration;

    showInfoPopup(`Test "${testName}" save ho gaya. Home page pe milega.`, 'Saved ✅');
    return testId;
  } catch (err) {
    console.error('Save error:', err);
    showInfoPopup('Test save nahi hua. Storage full ho sakti hai.', 'Error');
    throw err;
  }
}

/* ==================================================================
   LOAD SAVED TESTS LIST — For Home screen
   ================================================================== */
async function loadSavedTestsList() {
  if (!db) await initStorage();

  const container = document.getElementById('savedTestsList');
  if (!container) return;

  try {
    const tests = await idbGetAll(STORE_TESTS);

    if (tests.length === 0) {
      container.innerHTML = '<p class="empty-msg">Abhi koi test save nahi hai.</p>';
      return;
    }

    // Sort by latest first
    tests.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    container.innerHTML = '';
    tests.forEach(test => {
      const item = document.createElement('div');
      item.className = 'saved-item';

      const createdDate = new Date(test.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      item.innerHTML = `
        <div>
          <div class="saved-item-name">${escapeHtml(test.name)}</div>
          <div class="saved-item-meta">${test.crops.length} Q · ${test.duration} min · ${createdDate}</div>
        </div>
        <button class="saved-item-del" title="Delete" data-id="${test.id}">🗑️</button>
      `;

      // Click to load
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-item-del')) return;
        loadTestById(test.id);
      });

      // Delete button
      item.querySelector('.saved-item-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${test.name}"?`)) {
          await deleteTestById(test.id);
          loadSavedTestsList();
        }
      });

      container.appendChild(item);
    });
  } catch (err) {
    console.error('Load saved tests error:', err);
    container.innerHTML = '<p class="empty-msg">Saved tests load nahi hue.</p>';
  }
}

/* ==================================================================
   LOAD TEST BY ID — Loads into AppState, goes to review screen
   ================================================================== */
async function loadTestById(testId) {
  if (!db) await initStorage();

  try {
    const test = await idbGet(STORE_TESTS, testId);
    if (!test) {
      showInfoPopup('Test nahi mila.', 'Error');
      return;
    }

    // Restore into AppState
    AppState.crops = test.crops.map(c => ({ ...c }));
    AppState.testConfig = {
      id: test.id,
      name: test.name,
      duration: test.duration
    };

    console.log(`✅ Loaded test: ${test.name} (${test.crops.length} crops)`);

    // Navigate to review screen (so user can edit/start)
    showScreen('reviewScreen');
    if (typeof renderReviewList === 'function') {
      renderReviewList();
    }
  } catch (err) {
    console.error('Load test error:', err);
    showInfoPopup('Test load nahi hua.', 'Error');
  }
}

/* ==================================================================
   DELETE TEST
   ================================================================== */
async function deleteTestById(testId) {
  if (!db) await initStorage();

  try {
    await idbDelete(STORE_TESTS, testId);
    console.log(`🗑️ Deleted test: ${testId}`);
  } catch (err) {
    console.error('Delete error:', err);
  }
}

/* ==================================================================
   AUTO-SAVE — Save current crops (called periodically or on crop add)
   ================================================================== */
async function autoSaveCurrentDraft() {
  if (!db) await initStorage();
  if (AppState.crops.length === 0) return;

  const draftId = AppState.testConfig.id || 'draft_current';

  const draft = {
    id: draftId,
    name: AppState.testConfig.name || 'Untitled Draft',
    duration: AppState.testConfig.duration || 180,
    createdAt: AppState.testConfig.createdAt || Date.now(),
    updatedAt: Date.now(),
    isDraft: true,
    crops: AppState.crops.map(c => ({
      id: c.id,
      imageData: c.imageData,
      subject: c.subject,
      section: c.section,
      qNumber: c.qNumber,
      answer: c.answer
    }))
  };

  try {
    await idbPut(STORE_TESTS, draft);
    AppState.testConfig.id = draftId;
    console.log('💾 Draft auto-saved');
  } catch (err) {
    console.error('Auto-save failed:', err);
  }
}

/* ==================================================================
   CLEAR ALL STORAGE — For debugging / reset
   ================================================================== */
async function clearAllStorage() {
  if (!db) await initStorage();

  if (!confirm('Saara saved data delete ho jaayega. Sure?')) return;

  try {
    await idbClear(STORE_TESTS);
    console.log('🗑️ All storage cleared');
    loadSavedTestsList();
    showInfoPopup('Saara storage clear ho gaya.', 'Reset');
  } catch (err) {
    console.error('Clear error:', err);
  }
}

/* ==================================================================
   INDEXEDDB PROMISE WRAPPERS
   ================================================================== */
function idbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbClear(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ==================================================================
   UTILITIES
   ================================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==================================================================
   ESTIMATE STORAGE USAGE (for debugging)
   ================================================================== */
async function estimateStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    const usedMB = (est.usage / 1024 / 1024).toFixed(2);
    const quotaMB = (est.quota / 1024 / 1024).toFixed(2);
    console.log(`📊 Storage: ${usedMB} MB used / ${quotaMB} MB quota`);
    return { usedMB, quotaMB };
  }
  return null;
}
