const socket = io();

let partyCode = null;

let isHost = false;

function join() {

    const name = document.getElementById("nameInput").value;

    if (!name) return;

    socket.emit("join", name);

    document.getElementById("joinScreen").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
}

function createParty() {

    const name = document.getElementById("nameInput").value;
    const gender = document.getElementById("gender").value;

    socket.emit("createParty", {name, gender});
}

function joinParty() {

    const name = document.getElementById("nameInput").value;
    const gender = document.getElementById("gender").value;
    const code = document.getElementById("codeInput").value.toUpperCase();

    socket.emit("joinParty", {name, gender, code});
}

function submitDare() {

    const dare = document.getElementById("dareInput").value;

    if (!dare) return;

    socket.emit("submitDare", {
        code: partyCode,
        dare: dare
    });

    document.getElementById("dareInput").value = "";
}

function passGame(playerId) {
    socket.emit("gainLife", {
        code: partyCode,
        playerId: playerId
    });

    socket.emit("nextTurn", partyCode);
}

function failGame(playerId) {
    socket.emit("loseLife", {
        code: partyCode,
        playerId: playerId
    });

    socket.emit("nextTurn", partyCode);
}

function versusWinner(winnerId, loserId) {

    socket.emit("gainLife", {
        code: partyCode,
        playerId: winnerId
    });

    socket.emit("loseLife", {
        code: partyCode,
        playerId: loserId
    });

    socket.emit("nextTurn", partyCode);
}

socket.on("partyCode", (code) => {

    partyCode = code;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");

    document.getElementById("lobbyCode").innerText = code;
});

socket.on("turn", ({player, opponent, game}) => {

    const area = document.getElementById("miniGameArea");

    if (game === "two truths and a lie") {

        area.innerHTML = `
            <h2>${player.name}'s Turn</h2>
            <h3>Two Truths and a Lie</h3>
            <p>
            ${player.name} has to pick 2 truths and a lie.
            The group votes to guess the lie.
            If they guess incorrectly ${player.name} GAINS a life.
            HOWEVER. If they guess correctly, ${player.name} LOSES a life.
            </p>
            <button onclick="passGame('${player.id}')">Pass</button>
            <button onclick="failGame('${player.id}')">Fail</button>
        `;

    } else if (game === "arm wrestle" && opponent) {

        area.innerHTML = `
            <h2>Arm Wrestle</h2>
            <p>
            ${player.name} must arm wrestle ${opponent.name}.
            Rules are simple, winner gains a life and loser give up a life.
            We want a nice clean match. Or don't. We really don't care.
            </p>
            <button onclick="versusWinner('${player.id}','${opponent.id}')">
                ${player.name}
            </button>
            <button onclick="versusWinner('${opponent.id}','${player.id}')">
                ${opponent.name}
            </button>
        `;

    } else if (game === "draw off" && opponent) {

        area.innerHTML = `
            <h2>Draw Off</h2>
            <p>
            ${player.name} and ${opponent.name} must draw a picture in 30 seconds.
            The group votes on the best picture.
            The artist with the most magnificent masterpiece gains a life
            and the wash up artist give up a life.
            </p>
            <button onclick="versusWinner('${player.id}','${opponent.id}')">
                ${player.name}
            </button>
            <button onclick="versusWinner('${opponent.id}','${player.id}')">
                ${opponent.name}
            </button>
        `;

    } else {

        area.innerHTML =
            "<h2>" + player.name + "'s turn</h2>" +
            "<h3>Game: " + game + "</h3>";
    }
});

socket.on("host", (value) => {

    isHost = value;

    if (isHost) {
        document.getElementById("startBtn").classList.remove("hidden");
    }
});

socket.on("players", (players) => {

    const list = document.getElementById("playerList");

    list.innerHTML = "";

    players.forEach(p => {

        const li = document.createElement("li");

        li.textContent = `${p.name} (${p.lives})`;

        list.appendChild(li);
    });

});


socket.on("dares", (dares) => {

    const list = document.getElementById("dareList");

    list.innerHTML = "";

    dares.forEach(d => {

        const li = document.createElement("li");
        li.textContent = d;

        list.appendChild(li);
    });

});


socket.on("phase", (phase) => {

    const text = document.getElementById("phaseText");

    if (phase === "lobby") text.textContent = "Waiting for host";

    if (phase === "writing") {
        text.textContent = "Write Dares!";
        document.getElementById("dareArea").classList.remove("hidden");
    }

    if (phase === "playing") {
        text.textContent = "Game Time";
        document.getElementById("dareArea").classList.add("hidden");
    }

    document.getElementById("game").classList.remove("hidden");
    document.getElementById("lobby").classList.add("hidden");
});


socket.on("timer", (time) => {

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    document.getElementById("timer").textContent =
        minutes + ":" + seconds.toString().padStart(2, "0");
});

function startGame() {
    socket.emit("startGame", partyCode);
}