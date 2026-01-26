const socket = io();

const name = localStorage.getItem("playerName");
if (!name) location.href = "index.html";

console.log("=== HOST.JS LOADED ===");
console.log("Host name:", name);

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
const newRoundBtn = document.getElementById("newRoundBtn");

let currentCode = "";

socket.on("connect", () => {
  const savedCode = localStorage.getItem("roomCode");
  if (savedCode) {
    socket.emit("reconnectHost", { code: savedCode, name });
  } else {
    socket.emit("createRoom", name);
  }
});

socket.on("roomCreated", (code) => {
  currentCode = code;
  codeEl.innerText = code;
  localStorage.setItem("roomCode", code);
  console.log("Room created:", code);
});

socket.on("roomReconnected", (code) => {
  currentCode = code;
  codeEl.innerText = code;
  console.log("Reconnected to room:", code);
});

socket.on("reconnectFailed", () => {
  console.log("Reconnect failed, creating new room");
  localStorage.removeItem("roomCode");
  socket.emit("createRoom", name);
});

addAnswerBtn.onclick = () => {
  const div = document.createElement("div");
  div.innerHTML = `
    <input placeholder="Jawaban">
    <input type="number" placeholder="Skor">
    <button onclick="removeAnswer(this)">Hapus</button>
  `;
  answersDiv.appendChild(div);
};

function removeAnswer(btn) {
  btn.parentElement.remove();
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

newRoundBtn.onclick = () => {
  socket.emit("newRound", currentCode);
};

socket.on("playerList", (players) => {
  console.log("Player list updated:", players);
  playersEl.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `${p.name} - ${p.score}`;
    playersEl.appendChild(li);
  });
});

socket.on("newRound", ({ question, answers }) => {
  activeQuestionEl.innerText = question;
  answerList.innerHTML = answers.map((a, i) => `
    <div class="answer ${a.revealed ? 'revealed' : ''}" onclick="revealAnswer(${i})">
      ${a.text}
      <span>${a.score}</span>
    </div>
  `).join('');
});

function revealAnswer(index) {
  socket.emit("confirmAnswer", { code: currentCode, answerIndex: index });
}

socket.on("waitForQuestion", () => {
  activeQuestionEl.innerText = "-";
  answerList.innerHTML = "";
});
