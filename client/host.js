const socket = io();

const name = localStorage.getItem("playerName");
if (!name) location.href = "index.html";

const codeEl = document.getElementById("code");
const playersEl = document.getElementById("players");
const answersDiv = document.getElementById("answers");
const answerList = document.getElementById("answerList");
const activeQuestionEl = document.getElementById("activeQuestion");
const winnerEl = document.getElementById("winner");
const buzzList = document.getElementById("buzzList");

const startBtn = document.getElementById("start");
const addAnswerBtn = document.getElementById("addAnswer");
const nextTurnBtn = document.getElementById("nextTurn");

let currentCode = "";

socket.on("connect", () => {
  socket.emit("createRoom", name);
});

socket.on("roomCreated", (code) => {
  currentCode = code;
  codeEl.innerText = code;
  localStorage.setItem("roomCode", code);
});

addAnswerBtn.onclick = () => {
  const div = document.createElement("div");
  div.innerHTML = `
    <input placeholder="Jawaban">
    <input type="number" placeholder="Skor">
  `;
  answersDiv.appendChild(div);
};

startBtn.onclick = () => {
  const question = document.getElementById("question").value.trim();
  const answers = [];

  answersDiv.querySelectorAll("div").forEach(d => {
    const text = d.children[0].value.trim();
    const score = Number(d.children[1].value);
    if (text && score > 0) answers.push({ text, score });
  });

  socket.emit("setQuestion", {
    code: currentCode,
    question,
    answers
  });
};

socket.on("newRound", ({ question, answers }) => {
  activeQuestionEl.innerText = question;
  answerList.innerHTML = "";
  winnerEl.innerText = "-";

  answers.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "answer";
    div.innerText = `${a.text} (${a.score})`;
    div.onclick = () => {
      socket.emit("confirmAnswer", {
        code: currentCode,
        answerIndex: i
      });
    };
    answerList.appendChild(div);
  });
});

socket.on("buzzQueueUpdate", ({ queue, active }) => {
  buzzList.innerHTML = "";
  winnerEl.innerText = active ? active.name : "-";

  queue.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerText = `${i + 1}. ${p.name}`;
    if (active && p.id === active.id) {
      li.style.color = "gold";
      li.innerText += " ← GILIRAN";
    }
    buzzList.appendChild(li);
  });
});

nextTurnBtn.onclick = () => {
  socket.emit("nextTurn", currentCode);
};

socket.on("playerList", (players) => {
  playersEl.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `${p.name} - ${p.score}`;
    playersEl.appendChild(li);
  });
});
