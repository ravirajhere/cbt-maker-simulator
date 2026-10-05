# JEE Main CBT Simulator

A Computer-Based Test (CBT) simulator that replicates the exact NTA JEE Main interface for practice.

## Features

- NTA-like login, instructions, and test interface
- Real JEE Main interface layout with question palette, timer, and keypad
- Paper selection by year, session, and shift
- Subject-wise sections (Physics, Chemistry, Mathematics)
- Instant result with NTA marking scheme (+4/-1 for MCQ, +4/0 for Numerical)
- Fully responsive (desktop and mobile)

## Tech Stack

- HTML, CSS, Vanilla JavaScript
- KaTeX for LaTeX rendering
- Hosted on Vercel

## Data Source & License

**Questions in this project are sourced from the 
[eQOURSE JEE Main Question Bank](https://huggingface.co/datasets/eQOURSE/jee-main-questions), 
licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).**

We are grateful to eQOURSE for making this dataset publicly available.

## How to Run Locally

```bash
python -m http.server 8000
