const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

io.on("connection", (socket) => {

  socket.on("create_room", ({ nickname, gender }) => {
    const code = generateCode();

    rooms[code] = {
      admin: socket.id,
      players: [],
      dares: [],
      phase: "lobby",
      currentIndex: 0,
      autoDareUsed: false,
      pickDareUsed: false
    };

    rooms[code].players.push({
      id: socket.id,
      nickname,
      gender,
      lives: 1,
      joinedAt: Date.now()
    });

    socket.join(code);
    socket.emit("room_created", code);
  });

  socket.on("join_room", ({ code, nickname, gender }) => {
    if (!rooms[code]) return;

    rooms[code].players.push({
      id: socket.id,
      nickname,
      gender,
      lives: 1,
      joinedAt: Date.now()
    });

    socket.join(code);
    io.to(code).emit("update_players", rooms[code].players);
  });

  socket.on("start_game", (code) => {
    const room = rooms[code];
    if (!room || room.admin !== socket.id) return;

    room.phase = "dare_phase";

    io.to(code).emit("dare_phase_started");

    setTimeout(() => {
      room.phase = "game_phase";
      room.players.sort((a, b) => b.joinedAt - a.joinedAt);
      room.currentIndex = 0;
      io.to(code).emit("dare_phase_ended");
      nextTurn(code);
    }, 150000); // 2.5 minutes
  });

  socket.on("submit_dare", ({ code, dare }) => {
    const room = rooms[code];
    if (!room || room.phase !== "dare_phase") return;
    room.dares.push(dare);
  });

  socket.on("admin_result", ({ code, loserId }) => {
    const room = rooms[code];
    if (!room) return;

    const loser = room.players.find(p => p.id === loserId);
    if (!loser) return;

    loser.lives--;

    if (loser.lives <= 0) {
      const dare = getRandom(room.dares);
      io.to(code).emit("assign_dare", { player: loser.nickname, dare });
    } else {
      nextTurn(code);
    }
  });

  socket.on("dare_completed", (code) => {
    const room = rooms[code];
    if (!room) return;

    const player = room.players[room.currentIndex];
    if (player) player.lives++;

    nextTurn(code);
  });

});

function nextTurn(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.currentIndex >= room.players.length) {
    room.currentIndex = 0;
  }

  const currentPlayer = room.players[room.currentIndex];
  room.currentIndex++;

  const event = getRandom([
    "trivia",
    "arm_wrestle",
    "two_truths",
    "cars",
    "next_girl",
    "next_boy",
    "auto_dare",
    "pick_dare",
    "extra_life"
  ]);

  handleEvent(code, currentPlayer, event);
}

function handleEvent(code, player, event) {
  const room = rooms[code];

  if (event === "extra_life") {
    player.lives++;
    io.to(code).emit("message", `${player.nickname} gained a life!`);
    nextTurn(code);
    return;
  }

  if (event === "next_girl") {
    const next = room.players.find(p => p.gender === "girl");
    if (next) io.to(code).emit("challenge_player", next);
    return;
  }

  if (event === "next_boy") {
    const next = room.players.find(p => p.gender === "boy");
    if (next) io.to(code).emit("challenge_player", next);
    return;
  }

  if (event === "auto_dare" && !room.autoDareUsed) {
    room.autoDareUsed = true;
    const dare = getRandom(room.dares);
    io.to(code).emit("assign_dare", { player: player.nickname, dare });
    return;
  }

  if (event === "pick_dare" && !room.pickDareUsed) {
    room.pickDareUsed = true;
    io.to(code).emit("pick_someone_for_dare", player);
    return;
  }

  io.to(code).emit("start_minigame", { type: event, player });
}

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
