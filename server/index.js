const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("client"));

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =====================
  // RECONNECT HOST
  // =====================
  socket.on("reconnectHost", ({ code, name }) => {
    const room = rooms[code];
    if (!room || room.hostName !== name) return socket.emit("reconnectFailed");

    room.host = socket.id;
    socket.join(code);
    socket.emit("roomReconnected", code);
    io.to(code).emit("playerList", room.players);
    if (room.question) {
      io.to(code).emit("newRound", {
        question: room.question,
        answers: room.answers
      });
    } else {
      io.to(code).emit("waitForQuestion");
    }
    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[room.currentTurn] || null
    });

    console.log("HOST RECONNECTED:", code);
  });

  // =====================
  // CREATE ROOM
  // =====================
  socket.on("createRoom", (hostName) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    rooms[code] = {
      host: socket.id,
      hostName,
      players: [],
      question: null,
      answers: [],
      buzzQueue: [],
      currentTurn: 0
    };

    socket.join(code);
    socket.emit("roomCreated", code);

    console.log("ROOM CREATED:", code);
  });

  // =====================
  // JOIN ROOM
  // =====================
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

  // =====================
  // SET QUESTION (START ROUND)
  // =====================
  socket.on("setQuestion", ({ code, question, answers }) => {
    const room = rooms[code];
    if (!room) return;

    room.question = question;
    room.answers = answers.map(a => ({ ...a, revealed: false }));
    room.buzzQueue = [];
    room.currentTurn = 0;

    console.log("ROUND STARTED:", code, question);

    io.to(code).emit("newRound", {
      question: room.question,
      answers: room.answers
    });

    io.to(code).emit("buzzQueueUpdate", {
      queue: [],
      active: null
    });
  });

  // =====================
  // BUZZ (QUEUE SYSTEM)
  // =====================
  socket.on("buzz", (code) => {
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (room.buzzQueue.find(p => p.id === player.id)) return;

    room.buzzQueue.push({ id: player.id, name: player.name });

    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[room.currentTurn] || null
    });

    console.log("BUZZ:", player.name);
  });

  // =====================
  // NEXT TURN (HOST CONTROL)
  // =====================
  socket.on("nextTurn", (code) => {
    const room = rooms[code];
    if (!room) return;

    room.currentTurn++;

    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[room.currentTurn] || null
    });

    console.log("NEXT TURN");
  });

  // =====================
  // CONFIRM ANSWER
  // =====================
  socket.on("confirmAnswer", ({ code, answerIndex }) => {
    const room = rooms[code];
    if (!room) return;

    const answer = room.answers[answerIndex];
    const currentPlayer = room.buzzQueue[room.currentTurn];
    if (!answer || answer.revealed || !currentPlayer) return;

    const player = room.players.find(p => p.id === currentPlayer.id);
    if (!player) return;

    answer.revealed = true;
    player.score += answer.score;

    io.to(code).emit("answerRevealed", { index: answerIndex });
    io.to(code).emit("playerList", room.players);
  });

  // =====================
  // NEW ROUND
  // =====================
  socket.on("newRound", (code) => {
    const room = rooms[code];
    if (!room) return;

    room.question = null;
    room.answers = [];
    room.buzzQueue = [];
    room.currentTurn = 0;

    io.to(code).emit("waitForQuestion");
    io.to(code).emit("buzzQueueUpdate", {
      queue: [],
      active: null
    });

    console.log("NEW ROUND:", code);
  });

  // =====================
  // DISCONNECT
  // =====================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const code in rooms) {
      const room = rooms[code];

      room.players = room.players.filter(p => p.id !== socket.id);
      room.buzzQueue = room.buzzQueue.filter(p => p.id !== socket.id);

      if (room.host === socket.id) {
        delete rooms[code];
        console.log("ROOM CLOSED:", code);
      } else {
        io.to(code).emit("playerList", room.players);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
