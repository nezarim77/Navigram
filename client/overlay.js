const socket = io();

// ambil kode room
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

const questionEl = document.getElementById("question");
const boardEl = document.getElementById("board");
const activePlayerEl = document.getElementById("activePlayer");

if (!code) {
  questionEl.innerText = "NO ROOM CODE";
}

// join overlay
socket.emit("joinOverlay", code);

// =======================
// ROUND BARU
// =======================
socket.on("newRound", ({ question, answers }) => {
  questionEl.innerText = question;
  boardEl.innerHTML = "";
  activePlayerEl.innerText = "-";

  answers.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "answer-slot hidden";
    div.dataset.index = i;

    div.innerHTML = `
      <div>${i + 1}</div>
    `;

    boardEl.appendChild(div);
  });
});

// =======================
// JAWABAN DIBUKA
// =======================
socket.on("answerRevealed", ({ index, answer }) => {
  const slot = document.querySelector(
    `.answer-slot[data-index="${index}"]`
  );
  if (!slot) return;

  slot.classList.remove("hidden");
  slot.innerHTML = `
    <div class="answer-text">${answer.text}</div>
    <div class="score">${answer.score}</div>
  `;
});

// =======================
// UPDATE GILIRAN
// =======================
socket.on("buzzQueueUpdate", ({ active }) => {
  activePlayerEl.innerText = active
    ? `GILIRAN: ${active.name}`
    : "-";
});
