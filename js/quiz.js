// Quiz engine — three modes: symbol-match, atomic-number, category-sort.
import { getElements, CATEGORIES } from "./data.js";
import { store, recordQuizScore } from "./state.js";

const MODES = {
  "symbol-match": {
    title: "Symbol Match",
    blurb: "Pick the right symbol for each element name. Build speed and recall."
  },
  "atomic-number": {
    title: "Atomic Number",
    blurb: "Given a symbol, choose the correct atomic number from four options."
  },
  "category-sort": {
    title: "Category Sort",
    blurb: "Sort symbols into the right category — metal, gas, metalloid, and more."
  }
};

const QUESTION_COUNT = 10;
const PER_QUESTION_SEC = 30;

let session = null;

export function initQuiz() {
  renderMenu();
}

function renderMenu() {
  const root = document.getElementById("quiz-root");
  const best = store.get("quizBest") || {};
  const streak = store.get("streak") || { count: 0 };

  root.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Challenge · 3 Modes · Timer</div>
        <h1>Quiz <em>Arena</em>.</h1>
      </div>
      <div class="stats">
        <div><b>${streak.count}</b>day streak</div>
      </div>
    </div>
    <div class="quiz-menu" id="quiz-menu"></div>
  `;

  const menu = root.querySelector("#quiz-menu");
  Object.entries(MODES).forEach(([id, mode], i) => {
    const b = document.createElement("button");
    b.className = "quiz-mode";
    b.type = "button";
    b.innerHTML = `
      <div class="num">Mode ${String(i + 1).padStart(2, "0")}</div>
      <h3>${mode.title}</h3>
      <p>${mode.blurb}</p>
      ${best[id] ? `<div class="best">Best · ${best[id]} pts</div>` : `<div class="best" style="color:var(--muted)">Not played yet</div>`}
    `;
    b.addEventListener("click", () => start(id));
    menu.appendChild(b);
  });
}

function start(mode) {
  const elements = getElements();
  // sample 10 elements, avoiding duplicates
  const shuffled = [...elements].sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, QUESTION_COUNT);

  session = {
    mode, questions, index: 0, score: 0, startedAt: Date.now(), correctCount: 0,
    answered: false, timerRef: null, secondsLeft: PER_QUESTION_SEC
  };
  renderQuestion();
}

function renderQuestion() {
  clearInterval(session.timerRef);
  session.answered = false;
  session.secondsLeft = PER_QUESTION_SEC;
  const q = buildQuestion(session.mode, session.questions[session.index]);

  const root = document.getElementById("quiz-root");
  const progress = ((session.index) / QUESTION_COUNT) * 100;
  root.innerHTML = `
    <div class="quiz-stage">
      <div class="quiz-hud">
        <div class="hud-stat">Question<b>${session.index + 1} / ${QUESTION_COUNT}</b></div>
        <div class="hud-stat">Mode<b>${MODES[session.mode].title}</b></div>
        <div class="hud-stat">Time<b id="timer">${session.secondsLeft}s</b></div>
        <div class="hud-stat">Score<b>${session.score}</b></div>
      </div>
      <div class="progress"><div class="bar" style="--p:${progress}%"></div></div>

      <div class="quiz-prompt">
        <div class="eyebrow">${q.eyebrow}</div>
        ${q.symbol ? `<div class="big-sym">${q.symbol}</div>` : ""}
        <h2>${q.question}</h2>
      </div>

      <div class="choices" id="choices">
        ${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join("")}
      </div>
    </div>
  `;

  const btns = root.querySelectorAll(".choice");
  btns.forEach(b => b.addEventListener("click", () => answer(parseInt(b.dataset.i, 10), q)));

  // timer
  session.timerRef = setInterval(() => {
    session.secondsLeft--;
    const t = document.getElementById("timer");
    if (t) t.textContent = `${session.secondsLeft}s`;
    if (session.secondsLeft <= 0) {
      timeout(q);
    }
  }, 1000);
}

function buildQuestion(mode, element) {
  const pool = getElements();
  if (mode === "symbol-match") {
    const choices = uniqueRandom(pool.map(e => e.symbol), 3, [element.symbol]);
    return {
      eyebrow: "Pick the symbol",
      question: `What is the symbol for ${element.name}?`,
      correct: element.symbol,
      choices: shuffle([element.symbol, ...choices])
    };
  }
  if (mode === "atomic-number") {
    const choices = uniqueRandom(pool.map(e => String(e.atomicNumber)), 3, [String(element.atomicNumber)]);
    return {
      eyebrow: "Pick the atomic number",
      question: `Which atomic number belongs to this element?`,
      symbol: element.symbol,
      correct: String(element.atomicNumber),
      choices: shuffle([String(element.atomicNumber), ...choices])
    };
  }
  if (mode === "category-sort") {
    const correct = CATEGORIES.find(c => c.id === element.category)?.label || element.category;
    const others = CATEGORIES
      .filter(c => c.id !== element.category && c.id !== "unknown")
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => c.label);
    return {
      eyebrow: "Pick the category",
      question: `${element.name} (${element.symbol}) is a…`,
      correct,
      choices: shuffle([correct, ...others])
    };
  }
}

function uniqueRandom(pool, n, exclude) {
  const set = new Set(exclude);
  const out = [];
  while (out.length < n && set.size < pool.length) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!set.has(pick)) { set.add(pick); out.push(pick); }
  }
  return out;
}
function shuffle(a) { return a.slice().sort(() => Math.random() - 0.5); }

function answer(idx, q) {
  if (session.answered) return;
  session.answered = true;
  clearInterval(session.timerRef);

  const btns = document.querySelectorAll(".choice");
  btns.forEach((b, i) => {
    b.disabled = true;
    if (b.textContent === q.correct) b.classList.add("correct");
    else if (i === idx) b.classList.add("wrong");
  });

  const chosen = q.choices[idx];
  if (chosen === q.correct) {
    session.score += 10 + Math.max(0, session.secondsLeft);
    session.correctCount++;
  }
  setTimeout(nextQuestion, 1000);
}

function timeout(q) {
  if (session.answered) return;
  session.answered = true;
  clearInterval(session.timerRef);
  document.querySelectorAll(".choice").forEach(b => {
    b.disabled = true;
    if (b.textContent === q.correct) b.classList.add("correct");
  });
  setTimeout(nextQuestion, 1100);
}

function nextQuestion() {
  session.index++;
  if (session.index >= QUESTION_COUNT) finish();
  else renderQuestion();
}

function finish() {
  const elapsed = Math.round((Date.now() - session.startedAt) / 1000);
  recordQuizScore(session.mode, session.score);
  const best = store.get("quizBest")[session.mode] || 0;
  const accuracy = Math.round((session.correctCount / QUESTION_COUNT) * 100);

  const root = document.getElementById("quiz-root");
  root.innerHTML = `
    <div class="quiz-stage quiz-end">
      <div class="eyebrow" style="color:var(--muted);font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase">Run complete · ${MODES[session.mode].title}</div>
      <div class="score">${session.score}</div>
      <div class="summary">
        <b>${session.correctCount}</b> of <b>${QUESTION_COUNT}</b> correct ·
        <b>${accuracy}%</b> accuracy ·
        <b>${elapsed}s</b> elapsed ·
        Best <b>${best}</b>
      </div>
      <div class="actions">
        <button class="btn primary" id="play-again">Play again</button>
        <button class="btn" id="back-to-menu">Back to modes</button>
      </div>
    </div>
  `;
  root.querySelector("#play-again").addEventListener("click", () => start(session.mode));
  root.querySelector("#back-to-menu").addEventListener("click", () => renderMenu());
}
