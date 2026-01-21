document.getElementById("create").onclick = () => {
  const name = document.getElementById("name").value;
  if (!name) return alert("Isi nama");

  localStorage.setItem("playerName", name);
  localStorage.setItem("isHost", "true");

  window.location.href = "host.html";
};

document.getElementById("join").onclick = () => {
  const name = document.getElementById("name").value;
  const code = document.getElementById("code").value.toUpperCase();

  if (!name || !code) {
    alert("Nama & kode wajib");
    return;
  }

  localStorage.setItem("playerName", name);
  localStorage.setItem("roomCode", code);
  localStorage.setItem("isHost", "false");

  window.location.href = "player.html";
};
