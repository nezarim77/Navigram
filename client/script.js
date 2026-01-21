const socket = io("http://localhost:3000");

// CREATE ROOM (HOST)
document.getElementById("createRoomBtn").onclick = () => {
  socket.emit("createRoom");
};

socket.on("roomCreated", (code) => {
  alert("Room dibuat! Kode: " + code);
  localStorage.setItem("roomCode", code);
  localStorage.setItem("isHost", "true");
  window.location.href = "host.html";
});

// JOIN ROOM (PLAYER)
document.getElementById("joinRoomBtn").onclick = () => {
  const name = document.getElementById("nameInput").value;
  const code = document.getElementById("roomInput").value.toUpperCase();

  if (!name || !code) {
    alert("Nama dan kode room wajib diisi");
    return;
  }

  localStorage.setItem("playerName", name);
  localStorage.setItem("roomCode", code);
  localStorage.setItem("isHost", "false");

  document.getElementById("joinRoomBtn").onclick = () => {
  const name = document.getElementById("nameInput").value;
  const code = document.getElementById("roomInput").value.toUpperCase();

  if (!name || !code) {
    alert("Nama dan kode room wajib diisi");
    return;
  }

  localStorage.setItem("playerName", name);
  localStorage.setItem("roomCode", code);
  localStorage.setItem("isHost", "false");

  socket.emit("joinRoom", { name, code });
};

// TUNGGU KONFIRMASI SERVER
socket.on("joinSuccess", () => {
  window.location.href = "player.html";
});

socket.on("joinFailed", (msg) => {
  alert(msg);
});

};
