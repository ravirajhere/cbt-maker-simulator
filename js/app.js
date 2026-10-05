/* ============ GLOBAL STATE ============ */
let ALL_PAPERS = [];
let ALL_QUESTIONS = [];
let selectedPaperId = null;
let questions = [];
let currentIdx = 0;

/* ============ SCREEN NAV ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ============ LOGIN → PAPER SELECTION ============ */
function goToPaperSelection() {
  showScreen('paperSelectScreen');
  renderPaperSelection();
}

/* ============ LOAD DATA ============ */
async function loadData() {
  try {
    const [papersRes, questionsRes] = await Promise.all([
      fetch('data/papers.json'),
      fetch('data/questions.json')
    ]);
    ALL_PAPERS = await papersRes.json();
    ALL_QUESTIONS = await questionsRes.json();
    console.log(`✅ ${ALL_PAPERS.length} papers, ${ALL_QUESTIONS.length} questions loaded`);
  } catch (err) {
    console.error('❌ Data load failed:', err);
    // Fallback: sample data
    ALL_PAPERS = getSamplePapers();
    ALL_QUESTIONS = getSampleQuestions();
    console.log('Using fallback sample data');
  }
}

window.addEventListener('DOMContentLoaded', loadData);

/* ============ PAPER SELECTION ============ */
function renderPaperSelection() {
  const years = [...new Set(ALL_PAPERS.map(p => p.year))].sort((a,b) => b-a);
  const sessions = [...new Set(ALL_PAPERS.map(p => p.session))];
  const shifts = [...new Set(ALL_PAPERS.map(p => p.shift))].sort();

  const yearSel = document.getElementById('filterYear');
  const sessionSel = document.getElementById('filterSession');
  const shiftSel = document.getElementById('filterShift');

  yearSel.innerHTML = '<option value="">All Years</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');

  sessionSel.innerHTML = '<option value="">All Sessions</option>' +
    sessions.map(s => `<option value="${s}">${s}</option>`).join('');

  shiftSel.innerHTML = '<option value="">All Shifts</option>' +
    shifts.map(s => `<option value="${s}">Shift ${s}</option>`).join('');

  renderPaperList();
}

function applyFilters() { renderPaperList(); }

function clearFilters() {
  document.getElementById('filterYear').value = '';
  document.getElementById('filterSession').value = '';
  document.getElementById('filterShift').value = '';
  renderPaperList();
}

function renderPaperList() {
  const year = document.getElementById('filterYear').value;
  const session = document.getElementById('filterSession').value;
  const shift = document.getElementById('filterShift').value;

  const filtered = ALL_PAPERS.filter(p => {
    if (year && String(p.year) !== year) return false;
    if (session && p.session !== session) return false;
    if (shift && String(p.shift) !== shift) return false;
    return true;
  });

  const list = document.getElementById('paperList');
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:#888;padding:20px;">Koi paper nahi mila. Filters badal ke dekh.</p>';
    return;
  }

  filtered.forEach(paper => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <h4>${paper.examName}</h4>
      <p><strong>Date:</strong> ${paper.date}</p>
      <p><strong>Questions:</strong> ${paper.totalQuestions} | <strong>Duration:</strong> ${paper.duration} min</p>
      <span class="paper-tag">${paper.subject}</span>
      <span class="paper-cta">Click to start →</span>
    `;
    card.onclick = () => selectPaper(paper.id);
    list.appendChild(card);
  });
}

function selectPaper(paperId) {
  selectedPaperId = paperId;
  const paper = ALL_PAPERS.find(p => p.id === paperId);
  document.getElementById('selectedPaperName').textContent = paper.examName;

  // Reset checkbox + button
  document.getElementById('agreeCheck').checked = false;
  document.getElementById('readyBtn').disabled = true;

  showScreen('instructionsScreen');
}

/* ============ INSTRUCTIONS ============ */
function toggleReadyBtn() {
  document.getElementById('readyBtn').disabled =
    !document.getElementById('agreeCheck').checked;
}

/* ============ START TEST ============ */
function startTest() {
  if (!selectedPaperId) {
    alert('Pehle paper select kar!');
    return;
  }

  const filtered = ALL_QUESTIONS.filter(q => q.paperId === selectedPaperId);

  if (filtered.length === 0) {
    alert(`Is paper (${selectedPaperId}) ke liye koi question nahi mila.`);
    return;
  }

  questions = filtered.map((q, i) => ({
    ...q,
    id: i + 1,
    status: 'not-visited',
    userAnswer: null
  }));

  currentIdx = 0;

  const paper = ALL_PAPERS.find(p => p.id === selectedPaperId);
  document.getElementById('paperInfoBar').textContent = paper.examName;

  showScreen('testScreen');
  startTimer(paper.duration * 60);
  renderQuestion();
  renderPalette();
}

/* ============ TIMER ============ */
let timerInterval = null;
let timeLeft = 180 * 60;
let warned30 = false;

function startTimer(seconds) {
  timeLeft = seconds;
  warned30 = false;
  updateTimer();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      autoSubmit();
      return;
    }
    if (timeLeft === 30 * 60 && !warned30) {
      warned30 = true;
      alert('⚠️ Warning: 30 minutes remaining! Please review your answers.');
    }
    updateTimer();
  }, 1000);
}

function updateTimer() {
  const h = String(Math.floor(timeLeft / 3600)).padStart(2,'0');
  const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2,'0');
  const s = String(timeLeft % 60).padStart(2,'0');
  document.getElementById('timerDisplay').textContent = `${h}:${m}:${s}`;
}

function autoSubmit() {
  alert('Time is up! Your test has been auto-submitted.');
  finalSubmit();
}

/* ============ RENDER QUESTION ============ */
function renderQuestion() {
  const q = questions[currentIdx];
  if (!q) return;

  if (q.status === 'not-visited') q.status = 'not-answered';

  document.getElementById('qNumber').textContent = q.id;
  document.getElementById('qTypeBadge').textContent =
    q.type === 'mcq' ? 'MCQ' : 'Numerical';
  document.getElementById('questionText').innerHTML = q.question;

  const optList = document.getElementById('optionsList');
  const keypadWrap = document.getElementById('keypadWrap');

  if (q.type === 'mcq') {
    optList.style.display = 'flex';
    keypadWrap.style.display = 'none';
    optList.innerHTML = '';

    q.options.forEach((opt, i) => {
      const row = document.createElement('div');
      row.className = 'option-row' + (q.userAnswer === i+1 ? ' selected' : '');
      row.innerHTML = `<span class="opt-num">${i+1}.</span> <span>${opt}</span>`;
      row.onclick = () => selectOption(i+1);
      optList.appendChild(row);
    });
  } else {
    optList.style.display = 'none';
    keypadWrap.style.display = 'block';
    document.getElementById('numInput').value = q.userAnswer || '';
  }

  renderPalette();
  renderMath();
}

function selectOption(n) {
  questions[currentIdx].userAnswer = n;
  renderQuestion();
}

/* ============ KEYPAD ============ */
function keypad(v) {
  const inp = document.getElementById('numInput');
  if (v === '-' && inp.value.length > 0) return;
  if (v === '.' && inp.value.includes('.')) return;
  inp.value += v;
}
function backspace() {
  const inp = document.getElementById('numInput');
  inp.value = inp.value.slice(0, -1);
}
function clearNum() {
  document.getElementById('numInput').value = '';
}

/* ============ ACTIONS ============ */
function saveAndNext() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') {
    q.userAnswer = document.getElementById('numInput').value || null;
  }
  q.status = q.userAnswer ? 'answered' : 'not-answered';
  goNext();
}

function saveAndMark() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') {
    q.userAnswer = document.getElementById('numInput').value || null;
  }
  q.status = q.userAnswer ? 'answered-marked' : 'marked';
  goNext();
}

function markAndNext() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') {
    q.userAnswer = document.getElementById('numInput').value || null;
  }
  q.status = q.userAnswer ? 'answered-marked' : 'marked';
  goNext();
}

function clearResponse() {
  questions[currentIdx].userAnswer = null;
  questions[currentIdx].status = 'not-answered';
  renderQuestion();
}

function prevQ() {
  if (currentIdx > 0) { currentIdx--; renderQuestion(); }
}
function nextQ() {
  if (currentIdx < questions.length - 1) { currentIdx++; renderQuestion(); }
}
function goNext() {
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    renderQuestion();
  } else {
    renderPalette();
  }
}
function jumpTo(i) {
  currentIdx = i;
  renderQuestion();
}

/* ============ PALETTE ============ */
function renderPalette() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = '';
  const counts = {
    'not-visited': 0, 'not-answered': 0,
    'answered': 0, 'marked': 0, 'answered-marked': 0
  };

  questions.forEach((q, i) => {
    counts[q.status]++;
    const btn = document.createElement('button');
    btn.className = 'pal-btn ' + q.status +
      (i === currentIdx ? ' current' : '');
    btn.textContent = String(i+1).padStart(2, '0');
    btn.onclick = () => jumpTo(i);
    grid.appendChild(btn);
  });

  document.getElementById('cntNotVisited').textContent = counts['not-visited'];
  document.getElementById('cntNotAnswered').textContent = counts['not-answered'];
  document.getElementById('cntAnswered').textContent = counts['answered'];
  document.getElementById('cntMarked').textContent = counts['marked'];
  document.getElementById('cntMarkedAns').textContent = counts['answered-marked'];
}

/* ============ SUBMIT ============ */
function confirmSubmit() {
  const unattempted = questions.filter(q =>
    q.status === 'not-answered' || q.status === 'not-visited'
  ).length;
  document.getElementById('submitMsg').innerHTML =
    `You have <strong>${unattempted}</strong> unanswered question(s).<br>Are you sure you want to submit?`;
  document.getElementById('submitPopup').classList.add('active');
}
function closePopup() {
  document.getElementById('submitPopup').classList.remove('active');
}

function finalSubmit() {
  clearInterval(timerInterval);
  closePopup();

  let score = 0, correct = 0, wrong = 0, skipped = 0;

  questions.forEach(q => {
    const answered = (q.status === 'answered' || q.status === 'answered-marked');
    if (!answered) { skipped++; return; }

    const isCorrect = q.type === 'mcq'
      ? q.userAnswer === q.correct
      : String(q.userAnswer).trim() === String(q.correct).trim();

    if (isCorrect) { score += 4; correct++; }
    else {
      score -= (q.type === 'mcq' ? 1 : 0);
      wrong++;
    }
  });

  alert(
    `Test Submitted!\n\n` +
    `Score: ${score}\n` +
    `Correct: ${correct}\n` +
    `Wrong: ${wrong}\n` +
    `Skipped: ${skipped}`
  );

  // Wapas login pe bhej do
  showScreen('loginScreen');
}

/* ============ KATEX ============ */
function renderMath() {
  if (window.renderMathInElement) {
    const delims = [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ];
    renderMathInElement(document.getElementById('questionText'), { delimiters: delims });
    renderMathInElement(document.getElementById('optionsList'), { delimiters: delims });
  }
}

/* ============ FALLBACK SAMPLE DATA ============ */
function getSamplePapers() {
  return [
    {
      id: "2024-jan-s1", year: 2024, session: "January", shift: 1,
      date: "2024-01-27", examName: "JEE Main 2024 January Shift 1",
      subject: "Full Paper", totalQuestions: 3, duration: 180
    },
    {
      id: "2024-jan-s2", year: 2024, session: "January", shift: 2,
      date: "2024-01-27", examName: "JEE Main 2024 January Shift 2",
      subject: "Full Paper", totalQuestions: 3, duration: 180
    },
    {
      id: "2023-jan-s1", year: 2023, session: "January", shift: 1,
      date: "2023-01-24", examName: "JEE Main 2023 January Shift 1",
      subject: "Full Paper", totalQuestions: 3, duration: 180
    }
  ];
}

function getSampleQuestions() {
  return [
    {
      id: 1, paperId: "2024-jan-s1", subject: "Physics", type: "mcq",
      question: "The dimension of $\\dfrac{B^2}{2\\mu_0}$, where B is magnetic field and $\\mu_0$ is the magnetic permeability of vacuum, is:",
      options: ["$ML^2T^{-2}$", "$MLT^{-2}$", "$ML^2T^{-1}$", "$MLT^{-1}$"],
      correct: 1
    },
    {
      id: 2, paperId: "2024-jan-s1", subject: "Chemistry", type: "mcq",
      question: "The pH of 0.01 M HCl solution is:",
      options: ["1", "2", "3", "7"], correct: 2
    },
    {
      id: 3, paperId: "2024-jan-s1", subject: "Mathematics", type: "numerical",
      question: "Evaluate $\\int_0^1 x^2\\,dx$ (up to 3 decimals):",
      correct: "0.333"
    },
    {
      id: 4, paperId: "2024-jan-s2", subject: "Physics", type: "mcq",
      question: "A particle moves with velocity $v = 3t^2 - 6t$. Its acceleration at $t = 2$ s is:",
      options: ["6 m/s²", "12 m/s²", "18 m/s²", "24 m/s²"], correct: 3
    },
    {
      id: 5, paperId: "2024-jan-s2", subject: "Chemistry", type: "numerical",
      question: "Number of moles in 22 g of CO₂ (up to 1 decimal):",
      correct: "0.5"
    },
    {
      id: 6, paperId: "2024-jan-s2", subject: "Mathematics", type: "mcq",
      question: "If $f(x) = x^3 - 3x^2 + 4$, find $f'(2)$.",
      options: ["0", "4", "6", "12"], correct: 2
    },
    {
      id: 7, paperId: "2023-jan-s1", subject: "Physics", type: "mcq",
      question: "The SI unit of electric flux is:",
      options: ["N·m²/C", "N/C", "C/m²", "V/m"], correct: 1
    },
    {
      id: 8, paperId: "2023-jan-s1", subject: "Chemistry", type: "mcq",
      question: "Which of the following is the strongest oxidizing agent?",
      options: ["F₂", "Cl₂", "Br₂", "I₂"], correct: 1
    },
    {
      id: 9, paperId: "2023-jan-s1", subject: "Mathematics", type: "numerical",
      question: "The value of $\\sin 30° + \\cos 60°$ is:",
      correct: "1"
    }
  ];
}
