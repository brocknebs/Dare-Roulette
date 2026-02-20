const socket = io();

let isHost = false;

function join() {

    const name = document.getElementById("nameInput").value;

    if (!name) return;

    socket.emit("join", name);

    document.getElementById("joinScreen").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
}

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

        li.textContent = p.name;

        list.appendChild(li);
    });

});

socket.on("phase", (phase) => {

    const text = document.getElementById("phaseText");

    if (phase === "lobby") text.textContent = "Waiting for host";
    if (phase === "writing") text.textContent = "Write Dares!";
    if (phase === "playing") text.textContent = "Game Time";

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

    socket.emit("startGame");
}