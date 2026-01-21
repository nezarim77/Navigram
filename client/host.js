const socket = io();

// ============================
// BASIC CHECK
// ============================
const name = localStorage.getItem("playerName");
if (!name) {
  window.location.href = "index.html";
}

// ============================
// ELEMENTS
// ============================
const codeEl = document.getElementById("code");
const playersEl = document.getElementById("players");
const answersDiv = document.getElementById("answers");
const answerList = document.getElementById("answerList");
const winnerEl = document.getElementById("winner");
const activeQuestionEl = document.getElementById("activeQuestion");
const startBtn = document.getElementById("start");
const addAnswerBtn = document.getElementById("addAnswer");

let currentCode = "";
let currentAnswers = [];

// ============================
// SOCKET CONNECT → CREATE ROOM
// (INI FIX UTAMA)
// ============================
socket.on("connect", () => {
  console.log("Host connected:", socket.id);
  socket.emit("createRoom", name);
});

// ============================
// ROOM CREATED
// ============================
socket.on("roomCreated", (code) => {
  console.log("Room created:", code);
  currentCode = code;
  codeEl.innerText = code;
  localStorage.setItem("roomCode", code);
});

// ============================
// ADD ANSWER INPUT
// ============================
addAnswerBtn.onclick = () => {
  const div = document.createElement("div");
  div.style.marginBottom = "6px";
  div.innerHTML = `
    <input placeholder="Jawaban" style="width:200px">
    <input type="number" placeholder="Skor" style="width:60px">
  `;
  answersDiv.appendChild(div);
};

// ============================
// START ROUND
// ============================
startBtn.onclick = () => {
  if (!currentCode) {
    alert("Room belum siap, tunggu sebentar...");
    return;
  }

  const questionInput = document.getElementById("question");
  const question = questionInput.value.trim();

  const answers = [];
  answersDiv.querySelectorAll("div").forEach(d => {
    const text = d.children[0].value.trim();
    const score = Number(d.children[1].value);

    if (text && score > 0) {
      answers.push({ text, score });
    }
  });

  if (!question) {
    alert("Pertanyaan belum diisi");
    return;
  }

  if (answers.length === 0) {
    alert("Minimal 1 jawaban");
    return;
  }

  console.log("START ROUND → setQuestion", currentCode);

  socket.emit("setQuestion", {
    code: currentCode,
    question,
    answers
  });

  startBtn.disabled = true;
};

// ============================
// NEW ROUND (DARI SERVER)
// ============================
socket.on("newRound", ({ question, answers }) => {
  console.log("New round received:", question);

  activeQuestionEl.innerText = question;
  winnerEl.innerText = "-";
  startBtn.disabled = false;

  currentAnswers = answers;
  answerList.innerHTML = "";

  answers.forEach((a, i) => {
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    li.innerText = `${a.text} (${a.score})`;

    li.onclick = () => {
      socket.emit("confirmAnswer", {
        code: currentCode,
        answerIndex: i
      });
    };

    answerList.appendChild(li);
  });
});

// ============================
// BUZZ WINNER
// ============================
socket.on("buzzWinner", (player) => {
  console.log("Buzz winner:", player.name);
  winnerEl.innerText = player.name;
});

// ============================
// ANSWER REVEALED
// ============================
socket.on("answerRevealed", ({ index }) => {
  const li = answerList.children[index];
  if (li) {
    li.style.textDecoration = "line-through";
    li.style.opacity = "0.5";
  }
});

// ============================
// PLAYER LIST / SCOREBOARD
// ============================
socket.on("playerList", (players) => {
  playersEl.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `${p.name} - ${p.score}`;
    playersEl.appendChild(li);
  });
});
