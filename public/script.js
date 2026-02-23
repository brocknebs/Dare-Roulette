const socket = io();

let currentPlayers = [];

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

function loseLife(playerId) {

    socket.emit("loseLife", {
        code: partyCode,
        playerId: playerId
    });

    socket.emit("nextTurn", partyCode);
}

function completeDare() {
    socket.emit("completeDare", partyCode);
}

function getAutomaticDare() {
    socket.emit("automaticDare", partyCode);
}


socket.on("partyCode", (code) => {

    partyCode = code;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");

    document.getElementById("lobbyCode").innerText = code;
});

socket.on("turn", ({player, opponent, game}) => {

    const area = document.getElementById("miniGameArea");

    if (game === "Two Truths and a Lie") {

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

    } else if (game === "Arm Wrestle" && opponent) {

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

    } else if (game === "Draw Off" && opponent) {

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

    } else if (game === "Automatic Dare") {

        area.innerHTML = `
            <h2>${player.name}'s Turn</h2>
            <h3>Automatic Dare</h3>
            <button onclick="getAutomaticDare()">Get Your Dare</button>
        `;

    } else if (game === "Pick Someone To Do a Dare") {

        area.innerHTML = `
            <h2>${player.name} Picks Someone</h2>
            <div id="pickButtons"></div>
        `;

        const pickArea = document.getElementById("pickButtons");

        currentPlayers
            .filter(p => p.id !== player.id)
            .forEach(p => {

                const btn = document.createElement("button");
                btn.textContent = p.name;

                btn.onclick = () => {
                    socket.emit("pickDarePlayer", {
                        code: partyCode,
                        targetId: p.id
                    });
                };

                pickArea.appendChild(btn);
            });


    } else if (
        game === "Cars" ||
        game === "Categories" ||
        game === "Rhymes" ||
        game === "Stone Face" ||
        game === "Reach For The Sky"
    ) {

        let instruction = "";

        if (game === "Cars") {
            instruction = `
            In a circle pretend you are steering to the person to your right.
            You say "SKIRT" as you steer.
            If you decide to steer left, you say "SCREETCH."
            First person who makes a mistake or hesitates loses a life.
            `;
        }

        if (game === "Categories") {
            instruction = `
            ${player.name} picks a category.
            Going clockwise, everybody in the group must name something
            in that category without hesitation or repeating.
            First person to make a mistake loses a life.
            `;
        }

        if (game === "Rhymes") {
            instruction = `
            ${player.name} picks a word.
            Going clockwise, everybody in the group must say a word
            that rhymes without hesitation or repeating.
            First person to make a mistake loses a life.
            `;
        }

        if (game === "Stone Face") {
            instruction = `
            Starting with ${player.name}, look at a random person.
            Ask them a question. Then that person must ask someone else
            an original question.
            No one can laugh, smile, hesitate, or say a non-question.
            Loser loses a life.
            `;
        }

        if (game === "Reach For The Sky") {
            instruction = `
            THERE IS NO TIME!
            EVERYBODY STAND UP FULLY AND SIT DOWN!!!
            Last person to sit upon their buttocks must forfeit a life.
            `;
        }

        area.innerHTML = `
            <h2>${game.toUpperCase()}</h2>
            <p>${instruction}</p>
            <div id="loseButtons"></div>
        `;

        const buttonArea = document.getElementById("loseButtons");

        currentPlayers.forEach(p => {

            const btn = document.createElement("button");
            btn.textContent = p.name;

            btn.onclick = () => {
                loseLife(p.id);
            };

            buttonArea.appendChild(btn);
        });
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

    currentPlayers = players;

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

socket.on("dareAssigned", ({playerId, name, text}) => {

    const area = document.getElementById("miniGameArea");

    area.innerHTML = `
        <h2>${name} HAS BEEN ASSIGNED A DARE</h2>
        <p>${text}</p>
        <button onclick="completeDare()">Dare Completed</button>
    `;
});


function startGame() {
    socket.emit("startGame", partyCode);
}