/* ==================================================================
   JEE CBT MAKER — CBT Test Engine (NTA Layout)
   ================================================================== */

/* ============ CBT STATE ============ */
const CBTState = {
  testName: 'JEE Main Practice',
  duration: 180 * 60,
  timeLeft: 180 * 60,
  timerInterval: null,
  warned30: false,
  warned5: false,

  sections: {
    Physics: [],
    Chemistry: [],
    Mathematics: []
  },

  currentSubject: 'Physics',
  currentIdx: 0,
  isActive: false
};

/* ==================================================================
   CONFIG → INSTRUCTIONS
   ================================================================== */
function goToInstructions() {
  // Validation: answers must be set
  const validation = validateAllAnswers ? validateAllAnswers() : { valid: true };

  if (!validation.valid) {
    showInfoPopup(
      `${validation.missing} question(s) ka answer set nahi hua.<br><br>${validation.details.slice(0, 5).join('<br>')}${validation.details.length > 5 ? '<br>...' : ''}`,
      'Incomplete'
    );
    return;
  }

  // Set test name on instructions banner
  const nameInput = document.getElementById('configTestName');
  const name = (nameInput?.value || '').trim() || 'JEE Main Practice';
  const nameEl = document.getElementById('selectedPaperName');
  if (nameEl) nameEl.textContent = name;

  // Store in AppState
  AppState.testConfig.name = name;
  AppState.testConfig.duration = parseInt(document.getElementById('configDuration')?.value) || 180;

  // Reset checkbox + button
  const chk = document.getElementById('agreeCheck');
  const btn = document.getElementById('readyBtn');
  if (chk) chk.checked = false;
  if (btn) btn.disabled = true;

  showScreen('instructionsScreen');
}

function toggleReadyBtn() {
  const chk = document.getElementById('agreeCheck');
  const btn = document.getElementById('readyBtn');
  if (chk && btn) btn.disabled = !chk.checked;
}

/* ==================================================================
   START TEST — From instructions screen "I am ready to begin"
   ================================================================== */
function startTest() {
  // Build sections from crops
  CBTState.sections = { Physics: [], Chemistry: [], Mathematics: [] };

  AppState.crops.forEach(crop => {
    const subj = crop.subject;
    if (!CBTState.sections[subj]) CBTState.sections[subj] = [];

    CBTState.sections[subj].push({
      id: crop.id,
      imageData: crop.imageData,
      type: crop.section === 'MCQ' ? 'mcq' : 'numerical',
      correct: crop.answer,
      qNumber: crop.qNumber,
      status: 'not-visited',
      userAnswer: null
    });
  });

  // Sort each section: MCQ first (by qNumber), then Numerical
  Object.keys(CBTState.sections).forEach(subj => {
    CBTState.sections[subj].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'mcq' ? -1 : 1;
      return a.qNumber - b.qNumber;
    });
  });

  const total = Object.values(CBTState.sections).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) {
    showInfoPopup('Koi question nahi hai test ke liye.', 'Empty');
    return;
  }

  // Set state
  CBTState.testName = AppState.testConfig.name || 'JEE Main Practice';
  CBTState.duration = (AppState.testConfig.duration || 180) * 60;
  CBTState.timeLeft = CBTState.duration;
  CBTState.warned30 = false;
  CBTState.warned5 = false;
  CBTState.isActive = true;

  // Find first non-empty subject
  CBTState.currentSubject = Object.keys(CBTState.sections).find(
    s => CBTState.sections[s].length > 0
  ) || 'Physics';
  CBTState.currentIdx = 0;

  // Update UI — test name
  const nameEl = document.getElementById('cbtTestName');
  if (nameEl) nameEl.textContent = CBTState.testName;

  // Show test screen
  showScreen('testScreen');

  // Render section tabs
  renderSectionTabs();

  // Render first question
  renderCBTQuestion();

  // Start timer
  startCBTTimer();

  console.log(`🚀 CBT started: ${CBTState.testName} · ${total} questions`);
}

/* ==================================================================
   SECTION TABS
   ================================================================== */
function renderSectionTabs() {
  const subjects = ['Physics', 'Chemistry', 'Mathematics'];
  document.querySelectorAll('.nta-section-tab').forEach(tab => {
    const subj = tab.dataset.subject;
    const count = CBTState.sections[subj]?.length || 0;

    if (count === 0) {
      tab.style.display = 'none';
    } else {
      tab.style.display = '';
      tab.textContent = `${subj.toUpperCase()} (${count})`;
      tab.classList.toggle('active', subj === CBTState.currentSubject);
    }
  });
}

function switchSubject(subject) {
  if (subject === CBTState.currentSubject) return;
  if (!CBTState.sections[subject] || CBTState.sections[subject].length === 0) return;

  CBTState.currentSubject = subject;
  CBTState.currentIdx = 0;

  document.querySelectorAll('.nta-section-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.subject === subject);
  });

  renderCBTQuestion();
  renderCBTPalette();
}

/* ==================================================================
   RENDER CURRENT QUESTION
   ================================================================== */
function renderCBTQuestion() {
  const questions = CBTState.sections[CBTState.currentSubject];
  if (!questions || questions.length === 0) return;

  const q = questions[CBTState.currentIdx];
  if (!q) return;

  if (q.status === 'not-visited') q.status = 'not-answered';

  // Header
  const qNumEl = document.getElementById('qNumber');
  if (qNumEl) qNumEl.textContent = q.qNumber;

  const qTypeBadge = document.getElementById('qTypeBadge');
  if (qTypeBadge) {
    qTypeBadge.textContent = q.type === 'mcq' ? 'MCQ' : 'Numerical';
  }

  // Marks info (update if the element exists)
  const marksEl = document.querySelector('.nta-q-marks');
  if (marksEl) {
    marksEl.innerHTML = q.type === 'mcq'
      ? 'Marks: <strong>+4</strong> / <strong>−1</strong>'
      : 'Marks: <strong>+4</strong> / <strong>0</strong>';
  }

  // Question image
  const img = document.getElementById('questionImage');
  if (img) {
    img.src = q.imageData;
    img.alt = `Question ${q.qNumber}`;
  }

  // Options / Keypad
  const optionsList = document.getElementById('optionsList');
  const keypadWrap = document.getElementById('keypadWrap');

  if (q.type === 'mcq') {
    if (optionsList) optionsList.style.display = 'flex';
    if (keypadWrap) keypadWrap.style.display = 'none';
    renderMCQOptions(q);
  } else {
    if (optionsList) optionsList.style.display = 'none';
    if (keypadWrap) keypadWrap.style.display = 'block';

    const numInput = document.getElementById('numInput');
    if (numInput) numInput.value = q.userAnswer || '';
  }

  renderCBTPalette();
}

/* ==================================================================
   MCQ OPTIONS — NTA Radio Style
   ================================================================== */
function renderMCQOptions(q) {
  const list = document.getElementById('optionsList');
  if (!list) return;
  list.innerHTML = '';

  const labels = ['A', 'B', 'C', 'D'];
  for (let i = 1; i <= 4; i++) {
    const row = document.createElement('div');
    row.className = 'nta-option-row' + (q.userAnswer === i ? ' selected' : '');
    row.innerHTML = `
      <div class="nta-radio-circle">${labels[i - 1]}</div>
      <div class="nta-option-text">Option ${i}</div>
    `;
    row.addEventListener('click', () => selectCBTOption(i));
    list.appendChild(row);
  }
}

function selectCBTOption(optionNum) {
  const q = getCurrentQuestion();
  if (!q) return;
  q.userAnswer = optionNum;
  renderCBTQuestion();
}

/* ==================================================================
   KEYPAD
   ================================================================== */
function keypad(val) {
  const input = document.getElementById('numInput');
  if (!input) return;
  const current = input.value;
  if (val === '-' && current.length > 0) return;
  if (val === '.' && current.includes('.')) return;
  input.value = current + val;
}

function backspace() {
  const input = document.getElementById('numInput');
  if (!input) return;
  input.value = input.value.slice(0, -1);
}

function clearNum() {
  const input = document.getElementById('numInput');
  if (!input) return;
  input.value = '';
}

/* ==================================================================
   PALETTE
   ================================================================== */
function renderCBTPalette() {
  const grid = document.getElementById('paletteGrid');
  if (!grid) return;

  const questions = CBTState.sections[CBTState.currentSubject] || [];
  grid.innerHTML = '';

  // Update header
  const title = document.getElementById('paletteTitle');
  const sub = document.getElementById('paletteSubtitle');
  if (title) title.textContent = `${CBTState.currentSubject} — Section`;
  if (sub) sub.textContent = `Choose a Question (Total: ${questions.length})`;

  const counts = {
    'not-visited': 0,
    'not-answered': 0,
    'answered': 0,
    'marked': 0,
    'answered-marked': 0
  };

  questions.forEach((q, i) => {
    counts[q.status] = (counts[q.status] || 0) + 1;

    const btn = document.createElement('button');
    btn.className = 'nta-pal-btn ' + q.status + (i === CBTState.currentIdx ? ' current' : '');
    btn.textContent = String(i + 1).padStart(2, '0');
    btn.title = `Q${q.qNumber} · ${q.type === 'mcq' ? 'MCQ' : 'Numerical'}`;
    btn.addEventListener('click', () => jumpToCBTQuestion(i));
    grid.appendChild(btn);
  });

  setElText('cntNotVisited', counts['not-visited']);
  setElText('cntNotAnswered', counts['not-answered']);
  setElText('cntAnswered', counts['answered']);
  setElText('cntMarked', counts['marked']);
  setElText('cntMarkedAns', counts['answered-marked']);
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ==================================================================
   NAVIGATION ACTIONS
   ================================================================== */
function saveAndNext() {
  const q = getCurrentQuestion();
  if (!q) return;
  syncNumericalInput(q);

  q.status = (q.userAnswer !== null && q.userAnswer !== undefined && q.userAnswer !== '')
    ? 'answered' : 'not-answered';

  goToNextQuestion();
}

function saveAndMark() {
  const q = getCurrentQuestion();
  if (!q) return;
  syncNumericalInput(q);

  q.status = (q.userAnswer !== null && q.userAnswer !== undefined && q.userAnswer !== '')
    ? 'answered-marked' : 'marked';

  goToNextQuestion();
}

function markAndNext() {
  const q = getCurrentQuestion();
  if (!q) return;
  syncNumericalInput(q);

  q.status = (q.userAnswer !== null && q.userAnswer !== undefined && q.userAnswer !== '')
    ? 'answered-marked' : 'marked';

  goToNextQuestion();
}

function clearResponse() {
  const q = getCurrentQuestion();
  if (!q) return;

  q.userAnswer = null;
  q.status = 'not-answered';

  const numInput = document.getElementById('numInput');
  if (numInput) numInput.value = '';

  renderCBTQuestion();
}

function prevQ() {
  if (CBTState.currentIdx > 0) {
    CBTState.currentIdx--;
    renderCBTQuestion();
  }
}

function nextQ() {
  const questions = CBTState.sections[CBTState.currentSubject];
  if (CBTState.currentIdx < questions.length - 1) {
    CBTState.currentIdx++;
    renderCBTQuestion();
  }
}

function goToNextQuestion() {
  const questions = CBTState.sections[CBTState.currentSubject];

  if (CBTState.currentIdx < questions.length - 1) {
    CBTState.currentIdx++;
    renderCBTQuestion();
  } else {
    // Move to next section
    const subjects = ['Physics', 'Chemistry', 'Mathematics'];
    const currentSubjIdx = subjects.indexOf(CBTState.currentSubject);
    let nextSubj = null;

    for (let i = currentSubjIdx + 1; i < subjects.length; i++) {
      if (CBTState.sections[subjects[i]]?.length > 0) {
        nextSubj = subjects[i];
        break;
      }
    }

    if (nextSubj) {
      switchSubject(nextSubj);
      if (typeof showQuickToast === 'function') {
        showQuickToast(`Moved to ${nextSubj} 📑`);
      }
    } else {
      renderCBTPalette();
      if (typeof showQuickToast === 'function') {
        showQuickToast('Last question of last section ✅');
      }
    }
  }
}

function jumpToCBTQuestion(idx) {
  CBTState.currentIdx = idx;
  renderCBTQuestion();
}

/* ==================================================================
   HELPERS
   ================================================================== */
function getCurrentQuestion() {
  const questions = CBTState.sections[CBTState.currentSubject];
  if (!questions || questions.length === 0) return null;
  return questions[CBTState.currentIdx];
}

function syncNumericalInput(q) {
  if (q.type === 'numerical') {
    const input = document.getElementById('numInput');
    if (input) q.userAnswer = input.value.trim() || null;
  }
}

/* ==================================================================
   TIMER
   ================================================================== */
function startCBTTimer() {
  clearInterval(CBTState.timerInterval);
  updateCBTTimerDisplay();

  CBTState.timerInterval = setInterval(() => {
    CBTState.timeLeft--;

    if (CBTState.timeLeft <= 0) {
      clearInterval(CBTState.timerInterval);
      autoSubmitCBT();
      return;
    }

    if (CBTState.timeLeft === 30 * 60 && !CBTState.warned30) {
      CBTState.warned30 = true;
      showInfoPopup('⚠️ <strong>30 minutes remaining!</strong><br>Review your answers.', 'Time Warning');
    }

    if (CBTState.timeLeft === 5 * 60 && !CBTState.warned5) {
      CBTState.warned5 = true;
      showInfoPopup('⚠️ <strong>5 minutes remaining!</strong><br>Please prepare to submit.', 'Time Warning');
    }

    updateCBTTimerDisplay();
  }, 1000);
}

function updateCBTTimerDisplay() {
  const h = String(Math.floor(CBTState.timeLeft / 3600)).padStart(2, '0');
  const m = String(Math.floor((CBTState.timeLeft % 3600) / 60)).padStart(2, '0');
  const s = String(CBTState.timeLeft % 60).padStart(2, '0');

  const el = document.getElementById('timerDisplay');
  if (el) {
    el.textContent = `${h}:${m}:${s}`;

    if (CBTState.timeLeft <= 5 * 60) {
      el.style.background = '#dc3545';
    } else if (CBTState.timeLeft <= 30 * 60) {
      el.style.background = '#fd7e14';
    } else {
      el.style.background = '#0d6efd';
    }
  }
}

function autoSubmitCBT() {
  showInfoPopup('Time is up! Test auto-submitted.', 'Time Over');
  finalSubmit();
}

/* ==================================================================
   SUBMIT
   ================================================================== */
function confirmSubmit() {
  let total = 0;
  let unattempted = 0;

  Object.values(CBTState.sections).forEach(arr => {
    arr.forEach(q => {
      total++;
      if (q.status === 'not-answered' || q.status === 'not-visited') unattempted++;
    });
  });

  const answered = total - unattempted;

  const msgEl = document.getElementById('submitMsg');
  if (msgEl) {
    msgEl.innerHTML = `
      <div style="text-align:left;line-height:1.9;margin-top:12px;">
        <div><strong>Total:</strong> ${total}</div>
        <div><strong>Answered:</strong> ${answered}</div>
        <div><strong>Not Answered:</strong> ${unattempted}</div>
      </div>
      <p style="margin-top:14px;">Are you sure you want to submit?</p>
    `;
  }

  document.getElementById('submitPopup')?.classList.add('active');
}

function finalSubmit() {
  clearInterval(CBTState.timerInterval);
  CBTState.isActive = false;
  closePopup();

  const result = calculateCBTResult();
  renderCBTResult(result);
  showScreen('resultScreen');

  console.log('📊 Result:', result);
}

/* ==================================================================
   RESULT
   ================================================================== */
function calculateCBTResult() {
  const subjectWise = {};
  let totalScore = 0, totalCorrect = 0, totalWrong = 0, totalSkipped = 0;

  Object.keys(CBTState.sections).forEach(subj => {
    const arr = CBTState.sections[subj];
    let correct = 0, wrong = 0, skipped = 0, score = 0;

    arr.forEach(q => {
      const answered = (q.status === 'answered' || q.status === 'answered-marked');
      if (!answered) { skipped++; return; }

      const isCorrect = checkCBTAnswer(q);
      if (isCorrect) {
        correct++;
        score += 4;
      } else {
        wrong++;
        score -= (q.type === 'mcq' ? 1 : 0);
      }
    });

    subjectWise[subj] = { total: arr.length, correct, wrong, skipped, score };
    totalScore += score;
    totalCorrect += correct;
    totalWrong += wrong;
    totalSkipped += skipped;
  });

  return {
    testName: CBTState.testName,
    totalScore, totalCorrect, totalWrong, totalSkipped,
    subjectWise
  };
}

function checkCBTAnswer(q) {
  if (q.type === 'mcq') {
    return q.userAnswer === q.correct;
  } else {
    const userVal = parseFloat(q.userAnswer);
    const correctVal = parseFloat(q.correct);
    if (isNaN(userVal) || isNaN(correctVal)) {
      return String(q.userAnswer).trim() === String(q.correct).trim();
    }
    return Math.abs(userVal - correctVal) < 0.01;
  }
}

function renderCBTResult(result) {
  const nameEl = document.getElementById('resultTestName');
  if (nameEl) nameEl.textContent = result.testName;

  setElText('resultTotalScore', result.totalScore);
  setElText('resultCorrect', result.totalCorrect);
  setElText('resultWrong', result.totalWrong);
  setElText('resultSkipped', result.totalSkipped);

  const tbody = document.getElementById('resultTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const subjectOrder = ['Physics', 'Chemistry', 'Mathematics'];
  subjectOrder.forEach(subj => {
    const data = result.subjectWise[subj];
    if (!data || data.total === 0) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${subj}</strong></td>
      <td style="color:#198754;font-weight:600;">${data.correct}</td>
      <td style="color:#dc3545;font-weight:600;">${data.wrong}</td>
      <td style="color:#888;">${data.skipped}</td>
      <td style="color:#0b4a8f;font-weight:700;">${data.score}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==================================================================
   KEYBOARD SHORTCUTS (Test screen)
   ================================================================== */
document.addEventListener('keydown', (e) => {
  if (AppState.currentScreen !== 'testScreen') return;
  if (!CBTState.isActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.key) {
    case 'ArrowRight': nextQ(); break;
    case 'ArrowLeft': prevQ(); break;
    case '1': case '2': case '3': case '4':
      if (e.altKey) {
        const q = getCurrentQuestion();
        if (q && q.type === 'mcq') selectCBTOption(parseInt(e.key));
      }
      break;
  }
});

console.log('🎯 cbt.js loaded (NTA layout)');
