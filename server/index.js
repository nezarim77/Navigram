const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("client"));

const rooms = {};

// ==========================
// SOCKET
// ==========================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ======================
  // CREATE ROOM
  // ======================
  socket.on("createRoom", (hostName) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    rooms[code] = {
      host: socket.id,
      players: [],
      question: null,
      answers: [],
      buzzed: null
    };

    socket.join(code);
    socket.emit("roomCreated", code);

    console.log("ROOM CREATED:", code);
  });

  // ======================
  // JOIN ROOM
  // ======================
  socket.on("joinRoom", ({ name, code }) => {
    const room = rooms[code];
    if (!room) return;

    room.players.push({
      id: socket.id,
      name,
      score: 0
    });

    socket.join(code);
    socket.emit("joinSuccess");

    io.to(code).emit("playerList", room.players);

    console.log("JOIN SUCCESS:", name, "to", code);
  });

  // ======================
  // SET QUESTION (🔥 INI YANG HILANG)
  // ======================
  socket.on("setQuestion", ({ code, question, answers }) => {
    const room = rooms[code];
    if (!room) return;

    room.question = question;
    room.answers = answers.map(a => ({
      ...a,
      revealed: false
    }));
    room.buzzed = null;

    console.log("ROUND STARTED:", code, question);

    // 🔥 INI YANG BIKIN PLAYER KELUAR DARI "MENUNGGU SOAL"
    io.to(code).emit("newRound", {
      question: room.question,
      answers: room.answers
    });
  });

  // ======================
  // BUZZ
  // ======================
  socket.on("buzz", (code) => {
    const room = rooms[code];
    if (!room || room.buzzed) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    room.buzzed = player;

    io.to(code).emit("buzzWinner", player);
  });

  // ======================
  // CONFIRM ANSWER
  // ======================
  socket.on("confirmAnswer", ({ code, answerIndex }) => {
    const room = rooms[code];
    if (!room) return;

    const answer = room.answers[answerIndex];
    if (!answer || answer.revealed || !room.buzzed) return;

    answer.revealed = true;
    room.buzzed.score += answer.score;

    io.to(code).emit("answerRevealed", { index: answerIndex });
    io.to(code).emit("playerList", room.players);

    room.buzzed = null;
  });

  // ======================
  // DISCONNECT
  // ======================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const code in rooms) {
      const room = rooms[code];

      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.host === socket.id) {
        delete rooms[code];
        console.log("ROOM CLOSED:", code);
      } else {
        io.to(code).emit("playerList", room.players);
      }
    }
  });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
