const socket = io();
const name = localStorage.getItem("playerName");
const code = localStorage.getItem("roomCode");

const questionEl = document.getElementById("question");
const statusEl = document.getElementById("status");
const buzzBtn = document.getElementById("buzz");

socket.emit("joinRoom", { name, code });

buzzBtn.onclick = () => {
  socket.emit("buzz", code);
};

socket.on("newRound", ({ question }) => {
  questionEl.innerText = question;
  statusEl.innerText = "";
});

socket.on("buzzWinner", (player) => {
  if (player.id === socket.id) {
    statusEl.innerText = "KAMU MENJAWAB!";
  } else {
    statusEl.innerText = `${player.name} menjawab`;
  }
});

socket.on("resetBuzz", () => {
  statusEl.innerText = "";
});
