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


        // Validate name

        if (name === "") {

            alert("Please enter your name.");

            return;
        }


        // Student must enter registration number

        if (role === "student" && regNo === "") {

            alert(
                "Please enter your Registration Number."
            );

            return;
        }


        // Send user information to server

        socket.emit("joinMeeting", {

            name: name,
            role: role,
            regNo: regNo

        });


        console.log(
            "Joining meeting...",
            name
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
// CONNECTION STATUS
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


    // Display question

    question.innerText =
        poll.question;


    // Clear old options

    optionsDiv.innerHTML = "";


    // Create radio buttons

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


            // No option selected

            if (!selected) {

                alert(
                    "Please select one option."
                );

                return;

            }


            // Send vote to server

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


    // Calculate total votes

    let totalVotes = 0;


    for (const option in votes) {

        totalVotes += votes[option];

    }


    // Display every option

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

    alert(
        "You have already voted!"
    );

});


// =====================================================
// LIVE DISCUSSION - FRONTEND
// =====================================================

const messageInput =
    document.getElementById("messageInput");

const sendMessageBtn =
    document.getElementById("sendMessageBtn");

const messagesDiv =
    document.getElementById("messages");


// Send message

function sendMessage() {

    if (!messageInput) {

        return;

    }


    const message =
        messageInput.value.trim();


    if (message === "") {

        return;

    }


    /*
     * The backend will handle this event
     * when the real-time discussion feature
     * is connected.
     */

    socket.emit("sendMessage", {

        message: message

    });


    messageInput.value = "";

}


// Button click

if (sendMessageBtn) {

    sendMessageBtn.addEventListener(
        "click",
        sendMessage
    );

}


// Press Enter

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                sendMessage();

            }

        }
    );

}


// Receive message from backend

socket.on("receiveMessage", (data) => {

    addMessage(
        data.name || "Participant",
        data.message
    );

});


// Display message

function addMessage(name, message) {

    if (!messagesDiv) {

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
// AI SUMMARY EVENTS
// =====================================================

const generateSummaryBtn =
    document.getElementById(
        "generateSummaryBtn"
    );


/*
 * The actual AI summary generation is
 * handled by the backend.
 *
 * Frontend only sends the request and
 * displays the response.
 */

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
// DISPLAY AI SUMMARY
// =====================================================

function displaySummary(summary) {

    const container =
        document.getElementById(
            "summaryContainer"
        );


    if (!container) {

        return;

    }


    container.style.display =
        "block";


    // Summary

    const summaryText =
        document.getElementById(
            "summaryText"
        );


    if (summaryText) {

        summaryText.innerText =
            summary.summary || "No summary available.";

    }


    // Key Points

    displayList(
        "keyPoints",
        summary.keyPoints
    );


    // Decisions

    displayList(
        "decisions",
        summary.decisions
    );


    // Action Items

    displayActionItems(
        summary.actionItems
    );


    // Unresolved Issues

    displayList(
        "unresolvedIssues",
        summary.unresolvedIssues
    );

}


// =====================================================
// DISPLAY LIST
// =====================================================

function displayList(elementId, items) {

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

        element.appendChild(li);

        return;

    }


    items.forEach((item) => {

        const li =
            document.createElement("li");

        li.innerText =
            item;

        element.appendChild(li);

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
                Deadline: ${item.deadline || "None"}
            </div>

        `;


        container.appendChild(div);

    });

}