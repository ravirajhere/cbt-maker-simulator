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

function goToInstructions()
