const socket = io();

const name = localStorage.getItem("playerName");
const code = localStorage.getItem("roomCode");
if (!name || !code) location.href = "index.html";

const statusEl = document.getElementById("status");
const questionEl = document.getElementById("question");
const buzzBtn = document.getElementById("buzz");

socket.emit("joinRoom", { name, code });

buzzBtn.onclick = () => {
  socket.emit("buzz", code);
};

socket.on("newRound", ({ question }) => {
  questionEl.innerText = question;
  statusEl.innerText = "TEKAN BUZZ!";
  buzzBtn.disabled = false;
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
