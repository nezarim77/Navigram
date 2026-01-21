const socket = io();

const name = localStorage.getItem("playerName");
const code = localStorage.getItem("roomCode");
if (!name || !code) location.href = "index.html";

const statusEl = document.getElementById("status");
const questionEl = document.getElementById("question");
const answerList = document.getElementById("answerList");
const buzzBtn = document.getElementById("buzz");
const waitingGif = document.getElementById("waitingGif");

let answers = [];

socket.emit("joinRoom", { name, code });

buzzBtn.onclick = () => {
  socket.emit("buzz", code);
};

socket.on("newRound", ({ question, answers: ans }) => {
  answers = ans;
  questionEl.innerText = question;
  answerList.innerHTML = answers.map((a, i) => `
    <div class="answer ${a.revealed ? 'revealed' : ''}">
      ${a.revealed ? a.text : '???'}
      <span>${a.revealed ? a.score : ''}</span>
    </div>
  `).join('');
  waitingGif.style.display = "none";
  statusEl.innerText = "TEKAN BUZZ!";
  buzzBtn.disabled = false;
});

socket.on("answerRevealed", ({ index }) => {
  const answerDivs = answerList.children;
  const answer = answers[index];
  answerDivs[index].innerHTML = `
    ${answer.text}
    <span>${answer.score}</span>
  `;
  answerDivs[index].classList.add('revealed');
});

socket.on("waitForQuestion", () => {
  statusEl.innerText = "MENUNGGU SOAL...";
  questionEl.innerText = "-";
  answerList.innerHTML = "";
  waitingGif.style.display = "block";
  buzzBtn.disabled = true;
  answers = [];
});

socket.on("buzzQueueUpdate", ({ active }) => {
  if (!active) {
    statusEl.innerText = "MENUNGGU...";
    buzzBtn.disabled = false;
    return;
  }

  if (active.id === socket.id) {
    statusEl.innerText = "GILIRAN KAMU!";
    buzzBtn.disabled = true;
  } else {
    statusEl.innerText = `GILIRAN: ${active.name}`;
    buzzBtn.disabled = true;
  }
});
