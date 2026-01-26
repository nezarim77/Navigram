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
  console.log("Current rooms:", Object.keys(rooms));

  // =====================
// JOIN OVERLAY (VIEW ONLY)
// =====================
socket.on("joinOverlay", (code) => {
  if (!rooms[code]) return;
  socket.join(code);
  console.log("OVERLAY CONNECTED TO", code);
});


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
      active: room.buzzQueue[0] || null
    });

    console.log("HOST RECONNECTED:", code);
  });

  // =====================
  // RECONNECT PLAYER
  // =====================
  socket.on("reconnectPlayer", ({ code, name }) => {
    console.log("RECONNECT PLAYER REQUEST:", name, "to room", code);
    const room = rooms[code];
    if (!room) {
      console.log("Room not found for reconnect:", code);
      socket.emit("reconnectFailed");
      return;
    }

    // Cari pemain dengan nama yang sama
    let player = room.players.find(p => p.name === name);
    
    if (player) {
      console.log("Player found, reconnecting:", name);
      // Update socket ID dengan ID baru
      player.id = socket.id;
      
      // Update di buzz queue jika ada
      const buzzIndex = room.buzzQueue.findIndex(p => p.name === name);
      if (buzzIndex !== -1) {
        room.buzzQueue[buzzIndex].id = socket.id;
      }

      socket.join(code);
      socket.emit("reconnectSuccess", { code, name });
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
        active: room.buzzQueue[0] || null
      });

      console.log("PLAYER RECONNECTED:", name, "to", code);
    } else {
      console.log("Player not found in room for reconnect, will join as new player:", name);
      socket.emit("reconnectFailed");
    }
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
      buzzQueue: []
    };

    socket.join(code);
    socket.emit("roomCreated", code);

    console.log("ROOM CREATED:", code);
  });

  // =====================
  // JOIN ROOM
  // =====================
  socket.on("joinRoom", ({ name, code }) => {
    console.log("JOIN REQUEST:", name, "trying to join room", code);
    const room = rooms[code];
    
    if (!room) {
      console.log("Room not found:", code);
      socket.emit("joinFailed", "Room tidak ditemukan");
      return;
    }

    // Cek apakah pemain dengan nama yang sama sudah ada
    if (room.players.find(p => p.name === name)) {
      console.log("Player name already exists:", name);
      socket.emit("joinFailed", "Nama sudah digunakan");
      return;
    }

    room.players.push({
      id: socket.id,
      name,
      score: 0
    });

    socket.join(code);
    console.log("Player joined room:", name, "->", code, "Total players:", room.players.length);
    
    socket.emit("joinSuccess");
    io.to(code).emit("playerList", room.players);
    
    // Kirim state saat ini
    if (room.question) {
      console.log("Sending current question to new player:", room.question);
      socket.emit("newRound", {
        question: room.question,
        answers: room.answers
      });
    } else {
      console.log("No question yet, telling player to wait");
      socket.emit("waitForQuestion");
    }
    
    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[0] || null
    });
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

    console.log("ROUND STARTED:", code, question);

    // Kirim ke semua di room (including room yang baru join)
    io.to(code).emit("newRound", {
      question: room.question,
      answers: room.answers
    });

    io.to(code).emit("buzzQueueUpdate", {
      queue: [],
      active: null
    });

    console.log("Question broadcast to room:", code);
  });

  // =====================
  // BUZZ (QUEUE SYSTEM)
  // =====================
  socket.on("buzz", (code) => {
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Jika pemain sudah ada di antrean saat ini, abaikan (mencegah duplikat)
    if (room.buzzQueue.find(p => p.id === player.id)) return;

    // Tambahkan pemain ke akhir antrean
    room.buzzQueue.push({ id: player.id, name: player.name });

    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[0] || null
    });

    console.log("BUZZ:", player.name);
  });

  // =====================
  // NEXT TURN (HOST CONTROL)
  // =====================
  socket.on("nextTurn", (code) => {
    const room = rooms[code];
    if (!room) return;

    // Hapus pemain pertama dari antrean sehingga giliran berpindah ke pemain berikutnya
    room.buzzQueue.shift();

    io.to(code).emit("buzzQueueUpdate", {
      queue: room.buzzQueue,
      active: room.buzzQueue[0] || null
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
    const currentPlayer = room.buzzQueue[0];
    if (!answer || answer.revealed || !currentPlayer) return;

    const player = room.players.find(p => p.id === currentPlayer.id);
    if (!player) return;

    answer.revealed = true;
    player.score += answer.score;

    console.log("Answer revealed:", answerIndex, "->", answer.text, "Score:", answer.score);

    io.to(code).emit("answerRevealed", { 
      index: answerIndex,
      answer: {
        text: answer.text,
        score: answer.score
      }
    });

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
