// =====================================================
// SOCKET.IO CONNECTION
// =====================================================

const socket = io();


// =====================================================
// JOIN MEETING
// =====================================================

const joinBtn = document.getElementById("joinBtn");

if (joinBtn) {

    joinBtn.addEventListener("click", () => {

        const name =
            document.getElementById("name").value.trim();

        const role =
            document.getElementById("role").value;

        const regNo =
            document.getElementById("regNo").value.trim();

        const meetingId =
            document.getElementById("meetingId").value.trim().toUpperCase();
        document.getElementById("displayMeetingId").textContent =
    meetingId;

        // Validate name
        if (name === "") {

            alert("Please enter your name.");

            return;
        }


        // Validate registration number
        if (role === "student" && regNo === "") {

            alert(
                "Please enter your Registration Number."
            );

            return;
        }


        // Validate Meeting ID
        if (meetingId === "") {

            alert(
                "Please enter the Meeting ID."
            );

            return;
        }


        // Store current user information
        currentUser = {

            name: name,
            role: role,
            regNo: regNo,
            meetingId: meetingId

        };


        // Send join request to server
        socket.emit("joinMeeting", {

            name: name,
            role: role,
            regNo: regNo,
            meetingId: meetingId

        });


        console.log(
            "Joining meeting...",
            {
                name: name,
                role: role,
                regNo: regNo,
                meetingId: meetingId
            }
        );

    });

}


// =====================================================
// SUCCESSFULLY JOINED
// =====================================================

socket.on("joinedSuccessfully", () => {

    console.log(
        "Successfully joined meeting!"
    );


    const joinScreen =
        document.getElementById("joinScreen");

    const pollScreen =
        document.getElementById("pollScreen");


    if (joinScreen) {

        joinScreen.style.display = "none";

    }


    if (pollScreen) {

        pollScreen.style.display = "block";

    }

});


// =====================================================
// SOCKET CONNECTION
// =====================================================

socket.on("connect", () => {

    console.log(
        "Connected to Socket.IO server."
    );

});


socket.on("disconnect", () => {

    console.log(
        "Disconnected from Socket.IO server."
    );

});


// =====================================================
// RECEIVE CURRENT POLL
// =====================================================

socket.on("currentPoll", (poll) => {

    console.log(
        "Poll received:",
        poll
    );


    const question =
        document.getElementById("question");

    const optionsDiv =
        document.getElementById("options");


    if (!question || !optionsDiv) {

        return;

    }


    question.innerText =
        poll.question;


    optionsDiv.innerHTML = "";


    poll.options.forEach((option) => {

        const label =
            document.createElement("label");


        label.innerHTML = `

            <input
                type="radio"
                name="language"
                value="${option}"
            >

            <span>${option}</span>

        `;


        optionsDiv.appendChild(label);

    });

});


// =====================================================
// VOTE
// =====================================================

const voteBtn =
    document.getElementById("voteBtn");


if (voteBtn) {

    voteBtn.addEventListener(
        "click",
        () => {

            const selected =
                document.querySelector(
                    'input[name="language"]:checked'
                );


            if (!selected) {

                alert(
                    "Please select one option."
                );

                return;

            }


            socket.emit(
                "vote",
                selected.value
            );


            console.log(
                "Vote submitted:",
                selected.value
            );

        }
    );

}


// =====================================================
// LIVE VOTE RESULTS
// =====================================================

socket.on("voteUpdate", (votes) => {

    console.log(
        "Vote results:",
        votes
    );


    const resultsDiv =
        document.getElementById("results");


    if (!resultsDiv) {

        return;

    }


    resultsDiv.innerHTML = "";


    let totalVotes = 0;


    for (const option in votes) {

        totalVotes += votes[option];

    }


    for (const option in votes) {

        const count =
            votes[option];


        let percentage = 0;


        if (totalVotes > 0) {

            percentage =
                Math.round(
                    (count / totalVotes) * 100
                );

        }


        const resultRow =
            document.createElement("div");


        resultRow.className =
            "result-row";


        resultRow.innerHTML = `

            <div class="result-info">

                <span>
                    ${option}
                </span>

                <span>
                    ${count} (${percentage}%)
                </span>

            </div>


            <div class="result-bar">

                <div
                    class="result-fill"
                    style="width:${percentage}%"
                ></div>

            </div>

        `;


        resultsDiv.appendChild(
            resultRow
        );

    }

});


// =====================================================
// ALREADY VOTED
// =====================================================

socket.on("alreadyVoted", () => {

    alert("You have already voted!");

    const voteBtn = document.getElementById("voteBtn");

    if (voteBtn) {
        voteBtn.disabled = true;
        voteBtn.innerText = "Already Voted";
    }

    document
        .querySelectorAll('input[name="language"]')
        .forEach((input) => {
            input.disabled = true;
        });
});


// =====================================================
// LIVE DISCUSSION
// =====================================================

const messageInput =
    document.getElementById("messageInput");


const sendMessageBtn =
    document.getElementById("sendMessageBtn");


const messagesDiv =
    document.getElementById("messages");


// =====================================================
// SEND MESSAGE
// =====================================================

function sendMessage() {

    if (!messageInput) {

        console.error(
            "messageInput element not found."
        );

        return;

    }


    const message =
        messageInput.value.trim();


    if (message === "") {

        return;

    }


    console.log(
        "Sending message:",
        message
    );


    // IMPORTANT:
    // Backend expects the message text directly.
    //
    // server.js:
    // socket.on("sendMessage", async (messageText) => {

    socket.emit(
        "sendMessage",
        message
    );


    messageInput.value = "";

}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendMessageBtn) {

    sendMessageBtn.addEventListener(
        "click",
        sendMessage
    );

}


// =====================================================
// SEND MESSAGE USING ENTER
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


// =====================================================
// CHAT HISTORY
// =====================================================

socket.on("chatHistory", (messages) => {

    console.log(
        "Chat history received:",
        messages
    );


    if (!messagesDiv) {

        console.error(
            "messages element not found."
        );

        return;

    }


    /*
     * If there are no previous messages,
     * keep the default "Welcome to the meeting!"
     * message already present in index.html.
     */

    if (!messages || messages.length === 0) {

        return;

    }


    // Remove default welcome message

    messagesDiv.innerHTML = "";


    messages.forEach((message) => {

        addMessage(
            message.name || "Participant",
            message.text || "",
            message.time || ""
        );

    });

});


// =====================================================
// NEW REAL-TIME MESSAGE
// =====================================================

socket.on("newMessage", (message) => {

    console.log(
        "New message received:",
        message
    );


    addMessage(
        message.name || "Participant",
        message.text || "",
        message.time || ""
    );

});


// =====================================================
// MESSAGE SAVE ERROR
// =====================================================

socket.on("messageSaveError", (message) => {

    console.error(
        "Message save error:",
        message
    );


    alert(message);

});


// =====================================================
// DISPLAY MESSAGE
// =====================================================

function addMessage(
    name,
    message,
    time = ""
) {

    if (!messagesDiv) {

        console.error(
            "messages element not found."
        );

        return;

    }


    const messageDiv =
        document.createElement("div");


    messageDiv.className =
        "message";


    const firstLetter =
        name.charAt(0).toUpperCase();


    messageDiv.innerHTML = `

        <div class="avatar">

            ${firstLetter}

        </div>


        <div class="message-content">

            <strong>

                ${name}

            </strong>


            <p>

                ${message}

            </p>


            ${
                time
                    ? `<small>${time}</small>`
                    : ""
            }

        </div>

    `;


    messagesDiv.appendChild(
        messageDiv
    );


    // Automatically scroll to latest message

    messagesDiv.scrollTop =
        messagesDiv.scrollHeight;

}


// =====================================================
// AI SUMMARY
// =====================================================

const generateSummaryBtn =
    document.getElementById(
        "generateSummaryBtn"
    );


if (generateSummaryBtn) {

    generateSummaryBtn.addEventListener(
        "click",
        () => {

            console.log(
                "Requesting AI meeting summary..."
            );


            socket.emit(
                "generateSummary"
            );

        }
    );

}


// =====================================================
// AI SUMMARY GENERATED
// =====================================================

socket.on("summaryGenerated", (summary) => {

    console.log(
        "AI Summary received:",
        summary
    );


    displaySummary(summary);

});


// =====================================================
// EMPTY TRANSCRIPT
// =====================================================

socket.on("emptyTranscript", () => {

    alert(
        "No meeting discussion is available to summarize."
    );

});


// =====================================================
// SUMMARY ERROR
// =====================================================

socket.on("summaryError", (error) => {

    console.error(
        "AI Summary Error:",
        error
    );


    alert(
        "Unable to generate meeting summary."
    );

});


// =====================================================
// NOT AUTHORIZED
// =====================================================

socket.on("notAuthorized", () => {

    alert(
        "Only the meeting admin can generate the AI summary."
    );

});


// =====================================================
// MEETING NOT FOUND
// =====================================================

socket.on("meetingNotFound", () => {

    alert(
        "Meeting not found."
    );

});


// =====================================================
// DISPLAY AI SUMMARY
// =====================================================

function displaySummary(summary) {

    const container =
        document.getElementById(
            "summaryContainer"
        );


    if (!container) {

        console.error(
            "summaryContainer not found."
        );

        return;

    }


    container.style.display =
        "block";


    // -------------------------------------------------
    // SUMMARY
    // -------------------------------------------------

    const summaryText =
        document.getElementById(
            "summaryText"
        );


    if (summaryText) {

        summaryText.innerText =
            summary.summary ||
            "No summary available.";

    }


    // -------------------------------------------------
    // KEY POINTS
    // -------------------------------------------------

    displayList(
        "keyPoints",
        summary.keyPoints
    );


    // -------------------------------------------------
    // DECISIONS
    // -------------------------------------------------

    displayList(
        "decisions",
        summary.decisions
    );


    // -------------------------------------------------
    // ACTION ITEMS
    // -------------------------------------------------

    displayActionItems(
        summary.actionItems
    );


    // -------------------------------------------------
    // UNRESOLVED ISSUES
    // -------------------------------------------------

    displayList(
        "unresolvedIssues",
        summary.unresolvedIssues
    );

}


// =====================================================
// DISPLAY LIST
// =====================================================

function displayList(
    elementId,
    items
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;

    }


    element.innerHTML = "";


    if (!items || items.length === 0) {

        const li =
            document.createElement("li");


        li.innerText =
            "None";


        element.appendChild(
            li
        );


        return;

    }


    items.forEach((item) => {

        const li =
            document.createElement("li");


        li.innerText =
            item;


        element.appendChild(
            li
        );

    });

}


// =====================================================
// DISPLAY ACTION ITEMS
// =====================================================

function displayActionItems(items) {

    const container =
        document.getElementById(
            "actionItems"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (!items || items.length === 0) {

        container.innerHTML =
            "<p>No action items.</p>";

        return;

    }


    items.forEach((item) => {

        const div =
            document.createElement("div");


        div.className =
            "action-item";


        div.innerHTML = `

            <div class="action-person">

                ${item.person || "Team"}

            </div>


            <div>

                ${item.task || ""}

            </div>


            <div class="action-deadline">

                Deadline:
                ${item.deadline || "None"}

            </div>

        `;


        container.appendChild(
            div
        );

    });

}