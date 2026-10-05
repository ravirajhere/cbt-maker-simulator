/* ============ DUMMY QUESTIONS (baad mein eQOURSE se replace karenge) ============ */
const QUESTIONS = [
  {
    id: 1, subject: "Physics", type: "mcq",
    question: "The dimension of $\\dfrac{B^2}{2\\mu_0}$, where B is magnetic field and $\\mu_0$ is the magnetic permeability of vacuum, is:",
    options: ["$ML^2T^{-2}$", "$MLT^{-2}$", "$ML^2T^{-1}$", "$MLT^{-1}$"],
    correct: 1
  },
  { id: 2, subject: "Physics", type: "mcq",
    question: "A particle moves with velocity $v = 3t^2 - 6t$. Its acceleration at $t=2$ s is:",
    options: ["6 m/s²", "12 m/s²", "18 m/s²", "24 m/s²"], correct: 3 },
  { id: 3, subject: "Physics", type: "numerical",
    question: "A body of mass 2 kg is moving with velocity 5 m/s. Find its kinetic energy (in J).",
    correct: "25" },
  { id: 4, subject: "Chemistry", type: "mcq",
    question: "The pH of 0.01 M HCl solution is:",
    options: ["1", "2", "3", "7"], correct: 2 },
  { id: 5, subject: "Chemistry", type: "numerical",
    question: "Number of moles in 22 g of CO₂ is (rounded to 1 decimal):",
    correct: "0.5" },
  { id: 6, subject: "Mathematics", type: "mcq",
    question: "If $f(x) = x^3 - 3x^2 + 4$, find $f'(2)$.",
    options: ["0", "4", "6", "12"], correct: 1 },
  { id: 7, subject: "Mathematics", type: "numerical",
    question: "Evaluate $\\int_0^1 x^2\\,dx$ (up to 3 decimals):",
    correct: "0.333" }
];

/* ============ STATE ============ */
let questions = [];
let currentIdx = 0;

/* ============ SCREEN NAV ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToInstructions() {
  showScreen('instructionsScreen');
}

function toggleReadyBtn() {
  document.getElementById('readyBtn').disabled = !document.getElementById('agreeCheck').checked;
}

function startTest() {
  // Init questions with state
  questions = QUESTIONS.map(q => ({
    ...q,
    status: 'not-visited',   // not-visited | not-answered | answered | marked | answered-marked
    userAnswer: null
  }));
  currentIdx = 0;
  showScreen('testScreen');
  startTimer(180 * 60); // 3 hours
  renderQuestion();
  renderPalette();
}

/* ============ TIMER ============ */
let timerInterval = null;
let timeLeft = 180 * 60;
let warned30 = false;

function startTimer(seconds) {
  timeLeft = seconds;
  updateTimer();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) { clearInterval(timerInterval); finalSubmit(); return; }
    if (timeLeft === 30 * 60 && !warned30) {
      warned30 = true;
      alert('Warning: 30 minutes remaining!');
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

/* ============ RENDER QUESTION ============ */
function renderQuestion() {
  const q = questions[currentIdx];
  if (q.status === 'not-visited') q.status = 'not-answered';

  document.getElementById('qNumber').textContent = q.id;
  document.getElementById('qTypeBadge').textContent = q.type === 'mcq' ? 'MCQ' : 'Numerical';
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
function clearNum() { document.getElementById('numInput').value = ''; }

/* ============ ACTIONS ============ */
function saveAndNext() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') q.userAnswer = document.getElementById('numInput').value || null;
  if (q.userAnswer) q.status = 'answered'; else q.status = 'not-answered';
  goNext();
}
function saveAndMark() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') q.userAnswer = document.getElementById('numInput').value || null;
  q.status = q.userAnswer ? 'answered-marked' : 'marked';
  goNext();
}
function markAndNext() {
  const q = questions[currentIdx];
  if (q.type === 'numerical') q.userAnswer = document.getElementById('numInput').value || null;
  q.status = q.userAnswer ? 'answered-marked' : 'marked';
  goNext();
}
function clearResponse() {
  questions[currentIdx].userAnswer = null;
  questions[currentIdx].status = 'not-answered';
  renderQuestion();
}
function prevQ() { if (currentIdx > 0) { currentIdx--; renderQuestion(); } }
function nextQ() { if (currentIdx < questions.length - 1) { currentIdx++; renderQuestion(); } }
function goNext() {
  if (currentIdx < questions.length - 1) { currentIdx++; renderQuestion(); }
  else { renderPalette(); }
}
function jumpTo(i) { currentIdx = i; renderQuestion(); }

/* ============ PALETTE ============ */
function renderPalette() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = '';
  const counts = { 'not-visited':0, 'not-answered':0, 'answered':0, 'marked':0, 'answered-marked':0 };

  questions.forEach((q, i) => {
    counts[q.status]++;
    const btn = document.createElement('button');
    btn.className = 'pal-btn ' + q.status + (i === currentIdx ? ' current' : '');
    btn.textContent = String(i+1).padStart(2,'0');
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
  const unattempted = questions.filter(q => q.status === 'not-answered' || q.status === 'not-visited').length;
  document.getElementById('submitMsg').innerHTML =
    `You have <strong>${unattempted}</strong> unanswered question(s).<br>Are you sure you want to submit?`;
  document.getElementById('submitPopup').classList.add('active');
}
function closePopup() { document.getElementById('submitPopup').classList.remove('active'); }
function finalSubmit() {
  clearInterval(timerInterval);
  closePopup();

  // Score calc
  let score = 0, correct = 0, wrong = 0, skipped = 0;
  questions.forEach(q => {
    const answered = (q.status === 'answered' || q.status === 'answered-marked');
    if (!answered) { skipped++; return; }
    const isCorrect = q.type === 'mcq'
      ? q.userAnswer === q.correct
      : String(q.userAnswer).trim() === String(q.correct).trim();
    if (isCorrect) { score += 4; correct++; }
    else { score -= (q.type === 'mcq' ? 1 : 0); wrong++; }
  });

  alert(`Test Submitted!\n\nScore: ${score}\nCorrect: ${correct}\nWrong: ${wrong}\nSkipped: ${skipped}`);
}

/* ============ KATEX ============ */
function renderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.getElementById('questionText'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
    renderMathInElement(document.getElementById('optionsList'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
  }
}
