const socket = io();
let currentRoom = null;

function createRoom() {
  const nickname = document.getElementById("nickname").value;
  const gender = document.getElementById("gender").value;

  socket.emit("create_room", { nickname, gender });
}

function joinRoom() {
  const nickname = document.getElementById("nickname").value;
  const gender = document.getElementById("gender").value;
  const code = document.getElementById("roomCode").value;

  currentRoom = code;
  socket.emit("join_room", { code, nickname, gender });
}

socket.on("room_created", (code) => {
  currentRoom = code;
  document.body.innerHTML += `<p>Room Code: ${code}</p>
    <button onclick="startGame()">GET THIS PARTY STARTED</button>`;
});

function startGame() {
  socket.emit("start_game", currentRoom);
}

socket.on("dare_phase_started", () => {
  document.body.innerHTML += `
    <h2>Write Dares!</h2>
    <input id="dareInput" />
    <button onclick="submitDare()">Submit</button>`;
});

function submitDare() {
  const dare = document.getElementById("dareInput").value;
  socket.emit("submit_dare", { code: currentRoom, dare });
}

socket.on("start_minigame", (data) => {
  document.body.innerHTML += `<h2>${data.type} challenge for ${data.player.nickname}</h2>`;
});

socket.on("assign_dare", (data) => {
  document.body.innerHTML += `<h2>${data.player} must do: ${data.dare}</h2>
    <button onclick="completeDare()">COMPLETED</button>`;
});

function completeDare() {
  socket.emit("dare_completed", currentRoom);
}