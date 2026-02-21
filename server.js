const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let parties = {};

function generateCode() {
    return Math.random().toString(36).substring(2,6).toUpperCase();
}

io.on("connection", (socket) => {

    socket.on("loseLife", ({code, playerId}) => {

        const party = parties[code];
        if (!party) return;

        const player = party.players.find(p => p.id === playerId);
        if (!player) return;

        player.lives--;

        io.to(code).emit("players", party.players);
    });

    socket.on("gainLife", ({code, playerId}) => {

        const party = parties[code];
        if (!party) return;

        const player = party.players.find(p => p.id === playerId);
        if (!player) return;

        player.lives++;

        io.to(code).emit("players", party.players);
    });

    socket.on("submitDare", ({code, dare}) => {

        const party = parties[code];
        if (!party) return;

        party.dares.push(dare);

        io.to(code).emit("dares", party.dares);
    });


    socket.on("createParty", ({name, gender}) => {
    
        const code = generateCode();

        parties[code] = {
            host: socket.id,
            players: [],
            dares: [],
            phase: "lobby"
        };


        joinParty(socket, code, name, gender, true);
    });

    socket.on("joinParty", ({code, name, gender}) => {

        if (!parties[code]) return;

        joinParty(socket, code, name, gender, false);
    });

    socket.on("startGame", (code) => {

        const party = parties[code];
        if (!party) return;
        if (party.host !== socket.id) return;

        party.players.forEach(p => {
            p.lives = 1;
        });

        io.to(code).emit("players", party.players);

        party.phase = "writing";

        io.to(code).emit("phase", "writing");

        startWritingTimer(code, 150);
    });


    socket.on("disconnect", () => {

        for (const code in parties) {

            const party = parties[code];

            party.players = party.players.filter(p => p.id !== socket.id);

            io.to(code).emit("players", party.players);
        }

    });

});

function joinParty(socket, code, name, gender, isHost) {

    const party = parties[code];

    const player = {
        id: socket.id,
        name,
        gender,
        lives: 1
    };

    party.players.push(player);

    socket.join(code);

    socket.emit("partyCode", code);
    socket.emit("host", isHost);

    io.to(code).emit("players", party.players);
}

function startWritingTimer(code, seconds) {

    let timeLeft = seconds;

    const interval = setInterval(() => {

        const party = parties[code];
        if (!party) {
            clearInterval(interval);
            return;
        }

        io.to(code).emit("timer", timeLeft);

        timeLeft--;

        if (timeLeft < 0) {

            clearInterval(interval);

            party.phase = "playing";

            io.to(code).emit("phase", "playing");
        }

    }, 1000);
}


http.listen(3000, () => {
    console.log("Server running");
});