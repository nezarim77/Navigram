const socket = io();

const name = localStorage.getItem("playerName");
const code = localStorage.getItem("roomCode");

console.log("=== PLAYER.JS LOADED ===");
console.log("Name from localStorage:", name);
console.log("Code from localStorage:", code);

if (!name || !code) {
  console.log("Missing name or code, redirecting to index.html");
  location.href = "index.html";
}

const statusEl = document.getElementById("status");
const questionEl = document.getElementById("question");
const answerList = document.getElementById("answerList");
const buzzBtn = document.getElementById("buzz");
const waitingGif = document.getElementById("waitingGif");
const playerNameEl = document.getElementById("playerName");

let answers = [];
let hasReceivedRound = false;
let joinAttempted = false;

// Coba reconnect jika sudah pernah join sebelumnya
socket.on("connect", () => {
  console.log("🔗 Socket connected:", socket.id);
  if (!joinAttempted) {
    joinAttempted = true;
    console.log("🔄 Attempting to reconnect player with data:", { code, name });
    socket.emit("reconnectPlayer", { code, name });
    console.log("📤 reconnectPlayer event sent");
  }
});

socket.on("joinSuccess", () => {
  console.log("✓ Joined room successfully");
  playerNameEl.textContent = `Player: ${name}`;
  // Set default waiting state - akan di-override jika server kirim newRound
  waitingGif.style.display = "block";
  buzzBtn.style.display = "none";
  statusEl.innerText = "MENUNGGU SOAL...";
});

socket.on("reconnectSuccess", () => {
  console.log("✓ Reconnected successfully");
  playerNameEl.textContent = `Player: ${name}`;
  // Set default waiting state - akan di-override jika server kirim newRound
  waitingGif.style.display = "block";
  buzzBtn.style.display = "none";
  statusEl.innerText = "MENUNGGU SOAL...";
});

socket.on("reconnectFailed", () => {
  // Jika reconnect gagal, join sebagai pemain baru
  console.log("Reconnect failed, joining as new player");
  socket.emit("joinRoom", { name, code });
});

socket.on("joinFailed", (message) => {
  console.error("✗ Join failed:", message);
  alert("Gagal bergabung: " + message);
  setTimeout(() => location.href = "index.html", 1000);
});

buzzBtn.onclick = () => {
  console.log("Buzz button clicked");
  socket.emit("buzz", code);
};

socket.on("newRound", ({ question, answers: ans }) => {
  console.log("✓ New round received:", question);
  hasReceivedRound = true; // Mark bahwa sudah menerima round
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
  buzzBtn.style.display = "block";
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
  console.log("⏳ Waiting for question");
  hasReceivedRound = true; // Mark bahwa sudah menerima response dari server
  statusEl.innerText = "MENUNGGU SOAL...";
  questionEl.innerText = "-";
  answerList.innerHTML = "";
  waitingGif.style.display = "block";
  buzzBtn.style.display = "none";
  buzzBtn.disabled = true;
  answers = [];
});

socket.on("buzzQueueUpdate", ({ queue, active }) => {
  console.log("📋 Buzz queue updated:", queue, "Active:", active);
  if (!active) {
    statusEl.innerText = "MENUNGGU SOAL...";
    buzzBtn.disabled = false;
    return;
  }

  // Cek apakah pemain ini sudah buzz
  const playerAlreadyBuzzed = queue.some(p => p.id === socket.id);

  if (active.id === socket.id) {
    statusEl.innerText = "GILIRAN KAMU!";
    buzzBtn.disabled = true;
  } else if (playerAlreadyBuzzed) {
    // Pemain sudah buzz, tapi menunggu giliran
    const position = queue.findIndex(p => p.id === socket.id) + 1;
    statusEl.innerText = `ANTRIAN KE-${position}\nSEKARANG GILIRAN ${active.name}`;
    buzzBtn.disabled = true;
  } else {
    // Pemain belum buzz, bisa tekan
    statusEl.innerText = `GILIRAN: ${active.name}`;
    buzzBtn.disabled = false;
  }
});
