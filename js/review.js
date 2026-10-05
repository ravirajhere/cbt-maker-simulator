/* ==================================================================
   JEE CBT MAKER — Review Screen + Answer Key Setup
   ================================================================== */

/* ============ RENDER REVIEW LIST ============ */
function renderReviewList() {
  const list = document.getElementById('reviewList');
  const totalEl = document.getElementById('reviewTotal');
  if (!list) return;

  const crops = AppState.crops;

  if (totalEl) totalEl.textContent = crops.length;

  if (crops.length === 0) {
    list.innerHTML = '<p class="empty-msg">Koi crop nahi hai. Back jaake PDF se questions crop karo.</p>';
    return;
  }

  // Sort crops: Physics MCQ → Physics Num → Chem MCQ → Chem Num → Math MCQ → Math Num
  const subjectOrder = { Physics: 1, Chemistry: 2, Mathematics: 3 };
  const sectionOrder = { MCQ: 1, Numerical: 2 };

  const sorted = [...crops].sort((a, b) => {
    const so = (subjectOrder[a.subject] || 99) - (subjectOrder[b.subject] || 99);
    if (so !== 0) return so;
    const seco = (sectionOrder[a.section] || 99) - (sectionOrder[b.section] || 99);
    if (seco !== 0) return seco;
    return a.qNumber - b.qNumber;
  });

  list.innerHTML = '';

  sorted.forEach((crop, idx) => {
    const item = createReviewItem(crop, idx + 1);
    list.appendChild(item);
  });

  console.log(`📋 Review list rendered: ${crops.length} crops`);
}

/* ==================================================================
   CREATE REVIEW ITEM — For each crop
   ================================================================== */
function createReviewItem(crop, displayNum) {
  const item = document.createElement('div');
  item.className = 'review-item';
  item.dataset.cropId = crop.id;

  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'review-item-img';
  const img = document.createElement('img');
  img.src = crop.imageData;
  img.alt = `Question ${displayNum}`;
  imgWrap.appendChild(img);

  // Info
  const info = document.createElement('div');
  info.className = 'review-item-info';

  // Title
  const title = document.createElement('div');
  title.className = 'review-item-title';
  const sectionLabel = crop.section === 'MCQ' ? 'MCQ' : 'Numerical';
  title.innerHTML = `Q${crop.qNumber} · <span>${crop.subject} · ${sectionLabel} · Page ${crop.pageNum || '—'}</span>`;
  info.appendChild(title);

  // Answer setup
  const answerSetup = document.createElement('div');
  answerSetup.className = 'answer-setup';

  const answerLabel = document.createElement('label');
  answerLabel.textContent = crop.section === 'MCQ'
    ? 'Sahi option select karo:'
    : 'Sahi numerical value daalo:';
  answerSetup.appendChild(answerLabel);

  if (crop.section === 'MCQ') {
    // 4 option buttons
    const optsWrap = document.createElement('div');
    optsWrap.className = 'answer-options';

    const labels = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 4; i++) {
      const btn = document.createElement('button');
      btn.className = 'answer-opt-btn';
      btn.textContent = labels[i - 1];
      btn.dataset.value = i;
      btn.title = `Option ${i}`;
      if (crop.answer === i) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        setMCQAnswer(crop.id, i, optsWrap);
      });
      optsWrap.appendChild(btn);
    }
    answerSetup.appendChild(optsWrap);
  } else {
    // Numerical input
    const numInput = document.createElement('input');
    numInput.type = 'text';
    numInput.className = 'answer-num-input';
    numInput.placeholder = 'e.g. 25 or -3.5';
    numInput.value = crop.answer !== null && crop.answer !== undefined ? crop.answer : '';
    numInput.addEventListener('input', (e) => {
      setNumericalAnswer(crop.id, e.target.value);
    });
    answerSetup.appendChild(numInput);
  }

  info.appendChild(answerSetup);

  // Delete button (small, to remove a bad crop)
  const delBtn = document.createElement('button');
  delBtn.className = 'saved-item-del';
  delBtn.textContent = '🗑️';
  delBtn.title = 'Delete this crop';
  delBtn.style.marginLeft = 'auto';
  delBtn.addEventListener('click', () => {
    if (confirm(`Delete Q${crop.qNumber} (${crop.subject})?`)) {
      deleteCrop(crop.id);
      renderReviewList();
    }
  });
  info.appendChild(delBtn);

  item.appendChild(imgWrap);
  item.appendChild(info);

  return item;
}

/* ==================================================================
   SET MCQ ANSWER
   ================================================================== */
function setMCQAnswer(cropId, value, container) {
  const crop = AppState.crops.find(c => c.id === cropId);
  if (!crop) return;

  crop.answer = value;

  // Update UI — remove .selected from all, add to clicked
  container.querySelectorAll('.answer-opt-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  const clicked = container.querySelector(`.answer-opt-btn[data-value="${value}"]`);
  if (clicked) clicked.classList.add('selected');

  // Auto-save draft
  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(() => {});
  }

  console.log(`✅ Q${crop.qNumber} (${crop.subject} MCQ) → Option ${value}`);
}

/* ==================================================================
   SET NUMERICAL ANSWER
   ================================================================== */
function setNumericalAnswer(cropId, value) {
  const crop = AppState.crops.find(c => c.id === cropId);
  if (!crop) return;

  const trimmed = String(value).trim();

  // Validate: only numbers, minus, decimal point
  if (trimmed !== '' && !/^-?\d*\.?\d*$/.test(trimmed)) {
    console.warn('Invalid numerical input:', trimmed);
    return;
  }

  crop.answer = trimmed === '' ? null : trimmed;

  // Auto-save draft
  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(() => {});
  }
}

/* ==================================================================
   VALIDATE ALL ANSWERS SET
   ================================================================== */
function validateAllAnswers() {
  const missing = AppState.crops.filter(c =>
    c.answer === null || c.answer === undefined || c.answer === ''
  );

  if (missing.length > 0) {
    return {
      valid: false,
      missing: missing.length,
      details: missing.map(c => `Q${c.qNumber} (${c.subject} ${c.section})`)
    };
  }

  return { valid: true, missing: 0 };
}

/* ==================================================================
   RENDER STATS BAR (top of review screen)
   ================================================================== */
function renderReviewStats() {
  const header = document.querySelector('.review-header');
  if (!header) return;

  const crops = AppState.crops;
  const answered = crops.filter(c =>
    c.answer !== null && c.answer !== undefined && c.answer !== ''
  ).length;

  const bySubject = { Physics: 0, Chemistry: 0, Mathematics: 0 };
  crops.forEach(c => { bySubject[c.subject] = (bySubject[c.subject] || 0) + 1; });

  header.innerHTML = `
    <div><strong>Total:</strong> ${crops.length} questions · 
    <strong>Answers set:</strong> <span style="color:${answered === crops.length ? '#2e7d32' : '#e65100'}">${answered}/${crops.length}</span></div>
    <div style="margin-top:6px;font-size:12px;color:#555;">
      Physics: ${bySubject.Physics} · Chemistry: ${bySubject.Chemistry} · Mathematics: ${bySubject.Mathematics}
    </div>
  `;
}

/* ==================================================================
   HOOK INTO RENDER — Update stats too
   ================================================================== */
const _originalRenderReviewList = renderReviewList;
renderReviewList = function() {
  _originalRenderReviewList();
  renderReviewStats();
};

/* ==================================================================
   QUICK FILL — For testing (fill all MCQ with option 1)
   ================================================================== */
function quickFillAllMCQWithOption1() {
  if (!confirm('Sab MCQ ka answer "Option 1" set kar dein? (testing ke liye)')) return;

  AppState.crops.forEach(c => {
    if (c.section === 'MCQ') c.answer = 1;
  });

  renderReviewList();

  if (typeof autoSaveCurrentDraft === 'function') {
    autoSaveCurrentDraft().catch(() => {});
  }
}

/* ==================================================================
   KEYBOARD SHORTCUTS (review screen)
   ================================================================== */
document.addEventListener('keydown', (e) => {
  if (AppState.currentScreen !== 'reviewScreen') return;

  // Don't trigger if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Ctrl+Shift+F → quick fill (debug only)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    quickFillAllMCQWithOption1();
  }
});

console.log('📋 review.js loaded');
