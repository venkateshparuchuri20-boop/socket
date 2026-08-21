const socket = io();

let selectedOption = null;

const joinScreen = document.getElementById("joinScreen");
const pollScreen = document.getElementById("pollScreen");

const meetingIdInput = document.getElementById("meetingId");
const nameInput = document.getElementById("name");
const roleInput = document.getElementById("role");
const regNoInput = document.getElementById("regNo");

const joinBtn = document.getElementById("joinBtn");

const question = document.getElementById("question");
const options = document.getElementById("options");
const results = document.getElementById("results");

const voteBtn = document.getElementById("voteBtn");

const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");


joinBtn.addEventListener("click", () => {

    const meetingId = meetingIdInput.value.trim();
    const name = nameInput.value.trim();
    const role = roleInput.value;
    const regNo = regNoInput.value.trim();

    if (meetingId === "") {

        alert("Please enter Meeting ID");
        return;

    }

    if (name === "") {

        alert("Please enter your name");
        return;

    }

    if (role === "student" && regNo === "") {

        alert("Please enter Registration Number");
        return;

    }

    const user = {

        meetingId: meetingId,

        name: name,

        role: role,

        regNo: regNo

    };

    console.log("Joining meeting:", user);

    socket.emit(
        "joinMeeting",
        user
    );

});


socket.on("joinedSuccessfully", () => {

    console.log("Successfully joined meeting");

    joinScreen.style.display = "none";

    pollScreen.style.display = "block";

});


socket.on("meetingNotFound", () => {

    alert("Meeting not found. Please check the Meeting ID.");

});


socket.on("notJoined", () => {

    alert("Please join a meeting first.");

});


socket.on("currentPoll", (poll) => {

    console.log(
        "CURRENT POLL RECEIVED:",
        poll
    );

    question.innerText = poll.question;

    options.innerHTML = "";

    selectedOption = null;

    poll.options.forEach((option) => {

        const label = document.createElement("label");

        const radio = document.createElement("input");

        radio.type = "radio";

        radio.name = "pollOption";

        radio.value = option;

        radio.addEventListener("change", () => {

            selectedOption = option;

        });

        label.appendChild(radio);

        label.appendChild(
            document.createTextNode(" " + option)
        );

        const div = document.createElement("div");

        div.appendChild(label);

        options.appendChild(div);

    });

});


socket.on("voteUpdate", (votes) => {

    console.log(
        "LIVE RESULTS RECEIVED:",
        votes
    );

    results.innerHTML = "";

    const voteKeys = Object.keys(votes);

    if (voteKeys.length === 0) {

        results.innerHTML =
            "<p>No poll results yet.</p>";

        return;

    }

    voteKeys.forEach((option) => {

        const result = document.createElement("p");

        result.innerText =
            option + " : " + votes[option];

        results.appendChild(result);

    });

});


voteBtn.addEventListener("click", () => {

    if (!selectedOption) {

        alert("Please select an option.");

        return;

    }

    console.log(
        "Voting for:",
        selectedOption
    );

    socket.emit(
        "vote",
        selectedOption
    );

});


socket.on("alreadyVoted", () => {

    alert("You have already voted in this poll.");

});


socket.on("invalidOption", () => {

    alert("Invalid poll option.");

});


socket.on("noPoll", () => {

    alert("There is no active poll.");

});


socket.on("chatHistory", (messages) => {

    console.log(
        "Chat history received:",
        messages
    );

    chatMessages.innerHTML = "";

    messages.forEach((message) => {

        displayMessage(message);

    });

});


socket.on("newMessage", (message) => {

    console.log(
        "New message received:",
        message
    );

    displayMessage(message);

});


function displayMessage(message) {

    const messageDiv =
        document.createElement("div");

    messageDiv.innerHTML = `

        <p>
            <strong>${escapeHtml(message.name)}</strong>:
            ${escapeHtml(message.text)}
            <small>(${message.time})</small>
        </p>

    `;

    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


sendMessageBtn.addEventListener("click", sendMessage);


messageInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        sendMessage();

    }

});


function sendMessage() {

    const text =
        messageInput.value.trim();

    if (text === "") {

        return;

    }

    socket.emit(
        "sendMessage",
        text
    );

    messageInput.value = "";

}


socket.on("messageSaveError", (message) => {

    alert(message);

});


socket.on("notAuthorized", () => {

    alert(
        "You are not authorized to perform this action."
    );

});


socket.on("invalidPoll", () => {

    alert(
        "Please enter a valid question and at least two options."
    );

});


function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}