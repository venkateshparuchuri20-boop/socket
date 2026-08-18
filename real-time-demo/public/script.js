const socket = io();




console.log("Connected to Socket.IO");

socket.on("connect", () => {
    console.log("Socket Connected");
});


// ==========================
// JOIN MEETING
// ==========================

document.getElementById("joinBtn").addEventListener("click", () => {

    const meetingId = document.getElementById("meetingId").value.trim();
    const name = document.getElementById("name").value.trim();
    const role = document.getElementById("role").value;
    const regNo = document.getElementById("regNo").value.trim();

    if (meetingId === "") {
        alert("Please enter the Meeting ID.");
        return;
    }

    if (name === "") {
        alert("Please enter your name.");
        return;
    }

    if (role === "student" && regNo === "") {
        alert("Please enter your Registration Number.");
        return;
    }

    const user = {
        meetingId: meetingId,
        name: name,
        role: role,
        regNo: role === "student" ? regNo : null
    };

    socket.emit("joinMeeting", user);

});


// ==========================
// JOIN SUCCESS
// ==========================

socket.on("joinedSuccessfully", () => {

    document.getElementById("joinScreen").style.display = "none";

    document.getElementById("pollScreen").style.display = "block";

});


// ==========================
// MEETING NOT FOUND
// ==========================

socket.on("meetingNotFound", () => {

    alert("Meeting not found. Please check the Meeting ID.");

});


// ==========================
// VOTE
// ==========================

document.getElementById("voteBtn").addEventListener("click", () => {

    const selected = document.querySelector(
        'input[name="language"]:checked'
    );

    if (selected) {

        socket.emit("vote", selected.value);

    } else {

        alert("Please select one option.");

    }

});


// ==========================
// LIVE RESULTS
// ==========================

socket.on("voteUpdate", (votes) => {

    console.log("LIVE RESULTS RECEIVED:", votes);

    const resultsDiv = document.getElementById("results");

    resultsDiv.innerHTML = "";

    for (let option in votes) {

        resultsDiv.innerHTML += `
            <p>${option} : ${votes[option]}</p>
        `;

    }

});


// ==========================
// CURRENT POLL
// ==========================

socket.on("currentPoll", (poll) => {

    if (!poll) {
        return;
    }

    document.getElementById("question").innerText = poll.question;

    const optionsDiv = document.getElementById("options");

    optionsDiv.innerHTML = "";

    poll.options.forEach((option) => {

        optionsDiv.innerHTML += `
            <input type="radio" name="language" value="${option}">
            ${option}
            <br><br>
        `;

    });

});


// ==========================
// ALREADY VOTED
// ==========================

socket.on("alreadyVoted", () => {

    alert("You have already voted!");

});


// ==========================
// ROLE SELECTION
// ==========================

const roleSelect = document.getElementById("role");
const regNoInput = document.getElementById("regNo");

roleSelect.addEventListener("change", () => {

    if (roleSelect.value === "guest") {

        regNoInput.style.display = "none";
        regNoInput.value = "";

    } else {

        regNoInput.style.display = "inline-block";

    }

});