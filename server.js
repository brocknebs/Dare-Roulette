const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let parties = {};

function generateCode() {
    return Math.random().toString(36).substring(2,6).toUpperCase();
}

const miniGames = [
"Arm Wrestle",
"Automatic Dare",
"Stone Face",
"Two Truths and a Lie",
"Cars",
"Rhymes",
"Draw Off",
"Categories",
"Pick Someone To Do a Dare",
"Reach For The Sky"
];

function startTurn(code) {

    const party = parties[code];
    if (!party) return;

    if (party.players.length === 0) return;

    const player = party.players[party.turnIndex];

    let availableGames = [...miniGames];

    const game = availableGames[Math.floor(Math.random() * availableGames.length)];

    let opponent = null;

    if (game === "Arm Wrestle" || game === "Draw Off") {

        const possibleOpponents = party.players.filter(p => p.id !== player.id);

        if (possibleOpponents.length > 0) {
            opponent = possibleOpponents[
                Math.floor(Math.random() * possibleOpponents.length)
            ];
        }
    }

    io.to(code).emit("turn", {
        player: player,
        opponent: opponent,
        game: game
    });
}

io.on("connection", (socket) => {

    socket.on("pickDarePlayer", ({code, targetId}) => {

        const party = parties[code];
        if (!party || party.dares.length === 0) return;

        const target = party.players.find(p => p.id === targetId);
        if (!target) return;

        const randomIndex = Math.floor(Math.random() * party.dares.length);
        const dare = party.dares[randomIndex];

        party.currentDare = {
            playerId: target.id,
            dareIndex: randomIndex,
            text: dare
        };

        io.to(code).emit("dareAssigned", {
            playerId: target.id,
            name: target.name,
            text: dare
        });
    });


    socket.on("automaticDare", (code) => {

        const party = parties[code];
        if (!party || party.dares.length === 0) return;

        const player = party.players[party.turnIndex];
        if (!player) return;

        const randomIndex = Math.floor(Math.random() * party.dares.length);
        const dare = party.dares[randomIndex];

        party.currentDare = {
            playerId: player.id,
            dareIndex: randomIndex,
            text: dare
        };

        io.to(code).emit("dareAssigned", {
            playerId: player.id,
            name: player.name,
            text: dare
        });
    });


    socket.on("completeDare", (code) => {

        const party = parties[code];
        if (!party || !party.currentDare) return;

        const { playerId, dareIndex } = party.currentDare;

        const player = party.players.find(p => p.id === playerId);
        if (!player) return;

        // Remove dare from list
        party.dares.splice(dareIndex, 1);

        // Reset player life
        player.lives = 1;

        party.currentDare = null;

        io.to(code).emit("players", party.players);
        io.to(code).emit("dares", party.dares);

    });


    socket.on("nextTurn", (code) => {

        const party = parties[code];
        if (!party) return;

        party.turnIndex++;

        if (party.turnIndex >= party.players.length)
            party.turnIndex = 0;

        startTurn(code);
    });

    socket.on("loseLife", ({code, playerId}) => {

        const party = parties[code];
        if (!party) return;

        const player = party.players.find(p => p.id === playerId);
        if (!player) return;

        player.lives--;

        if (player.lives <= 0 && party.dares.length > 0) {

            const randomIndex = Math.floor(Math.random() * party.dares.length);
            const dare = party.dares[randomIndex];

            party.currentDare = {
                playerId: player.id,
                dareIndex: randomIndex,
                text: dare
            };

            io.to(code).emit("dareAssigned", {
                playerId: player.id,
                name: player.name,
                text: dare
            });

        } else {
            io.to(code).emit("players", party.players);
        }

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
            phase: "lobby",
            turnIndex: 0,
            usedAutoDare: false,
            usedPickDare: false
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

            startTurn(code);
        }

    }, 1000);
}


const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log("Server running on port", PORT);
});