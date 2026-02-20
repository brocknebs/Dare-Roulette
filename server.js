const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = [];
let host = null;
let phase = "lobby";
let timer = 0;
let interval;

io.on("connection", (socket) => {

    socket.on("join", (name) => {

        if (!host) host = socket.id;

        players.push({
            id: socket.id,
            name: name
        });

        socket.emit("host", socket.id === host);

        io.emit("players", players);
        io.emit("phase", phase);
    });

    socket.on("startGame", () => {
        if (socket.id !== host) return;

        phase = "writing";
        startTimer(150);

        io.emit("phase", phase);
    });

    socket.on("disconnect", () => {

        players = players.filter(p => p.id !== socket.id);

        if (socket.id === host && players.length > 0) {
            host = players[0].id;
        }

        io.emit("players", players);
    });

});

function startTimer(seconds) {

    timer = seconds;

    clearInterval(interval);

    interval = setInterval(() => {

        timer--;

        io.emit("timer", timer);

        if (timer <= 0) {

            clearInterval(interval);

            phase = "playing";

            io.emit("phase", phase);
        }

    }, 1000);
}

http.listen(3000, () => {
    console.log("Server running");
});
