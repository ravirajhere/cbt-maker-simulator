# JEE Main CBT Simulator & Maker

A tool that converts any question paper PDF into a fully functional NTA JEE Main-style Computer-Based Test (CBT). Upload a PDF, crop questions, set the answer key, and practice in an interface that feels exactly like the real exam.

**No data leaves your device. Everything runs locally in your browser.**

---

## Features

### Test Maker
- **PDF Upload** — Upload any question paper PDF (NTA papers, coaching mocks, scanned papers — anything)
- **Visual Crop Tool** — Drag-select to crop questions directly from the PDF
- **Smart Metadata** — Tag each crop with subject (Physics/Chemistry/Mathematics), section (MCQ/Numerical), and question number
- **Answer Key Setup** — Set correct answers with click-to-select (MCQ) or input field (Numerical)
- **Local Storage** — Tests saved in browser via IndexedDB. No server, no uploads, no tracking.

### CBT Simulator
- **Exact NTA Interface** — Login, instructions, question palette, timer, section tabs
- **Color-Coded Palette** — White (not visited), Orange (not answered), Green (answered), Purple (marked), Purple+✓ (answered & marked)
- **Section Tabs** — Switch between Physics, Chemistry, Mathematics seamlessly
- **3-Hour Timer** — With 30-min and 5-min warnings, auto-submit on time-out
- **Numerical Keypad** — On-screen keypad (0-9, −, ., ⌫, Clear) for integer-type answers
- **NTA Marking Scheme** — +4/−1 for MCQ, +4/0 for Numerical
- **Submit Confirmation** — Summary popup before final submission
- **Subject-wise Scorecard** — Detailed breakdown with correct, wrong, and skipped counts
- **Fully Responsive** — Works on desktop, tablet, and mobile

---

## Tech Stack

- **HTML, CSS, Vanilla JavaScript** — No frameworks, no build step
- **PDF.js** — Renders PDF pages to canvas for cropping
- **IndexedDB** — Stores cropped questions, answers, and saved tests locally
- **KaTeX** — Renders mathematical notation (used in the CBT interface)
- **Hosted on Vercel** (optional)

---

## How to Use

### 1. Create a Test

1. Open the app and click **"PDF Upload Karo"**
2. Select your question paper PDF
3. On the crop screen, **drag** to select each question
4. Set **Subject**, **Section**, and **Question Number** in the right panel
5. Click **"Save This Crop"**
6. Repeat for all questions in the paper
7. Click **"Review Questions →"**

### 2. Set Answer Key

1. For each cropped question, set the correct answer:
   - **MCQ** — Click the correct option (A / B / C / D)
   - **Numerical** — Type the numeric value
2. Once all answers are set, click **"Configure Test →"**

### 3. Configure & Start

1. Set the **test name** and **duration** (default: 180 minutes)
2. Click **"Start Test"**
3. The CBT interface opens — same as NTA JEE Main

### 4. Take the Test

- Use **section tabs** to switch subjects
- **Save & Next**, **Mark for Review**, or **Clear Response** as needed
- Watch the **timer** (top right)
- Click **SUBMIT** when done

### 5. View Result

- Total score, correct, wrong, skipped
- Subject-wise breakdown

---

## How to Run Locally

The app requires a local server (PDF.js won't work with `file://` protocol).

### Option 1: Python (simplest)

```bash
cd jee-cbt-maker
python -m http.server 8000
