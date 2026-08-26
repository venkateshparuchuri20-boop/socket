const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { GoogleGenAI } = require("@google/genai");

require("dotenv").config();


// =====================================================
// APP SETUP
// =====================================================

const app = express();

app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);

const io = new Server(server);


// =====================================================
// MONGODB
// =====================================================

async function generateUniqueMeetingId() {

    let meetingId;
    let exists = true;

    while (exists) {

        meetingId =
            "MEET" +
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        exists =
            await Meeting.exists({
                meetingId
            });
    }

    return meetingId;
}
async function connectMongoDB() {

    try {

        if (!process.env.MONGODB_URI) {

            throw new Error(
                "MONGODB_URI is missing from .env"
            );
        }

        await mongoose.connect(
            process.env.MONGODB_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log(
            "MongoDB connected successfully"
        );

    } catch (error) {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
}


// =====================================================
// MEETING MODEL
// =====================================================

const meetingSchema = new mongoose.Schema({

    meetingId: {
        type: String,
        required: true,
        unique: true
    },

    createdBy: {
        type: String,
        default: "admin"
    },

    status: {
        type: String,
        default: "active"
    },

    transcript: {
        type: String,
        default: ""
    },

    summary: {
        type: String,
        default: ""
    },

    keyPoints: {
        type: [String],
        default: []
    },

    decisions: {
        type: [String],
        default: []
    },

    actionItems: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    unresolvedIssues: {
        type: [String],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});


const Meeting =
    mongoose.models.Meeting ||
    mongoose.model(
        "Meeting",
        meetingSchema
    );


// =====================================================
// MESSAGE MODEL
// =====================================================

const messageSchema = new mongoose.Schema({

    meetingId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    role: {
        type: String,
        default: "student"
    },

    regNo: {
        type: String,
        default: ""
    },

    text: {
        type: String,
        required: true
    },

    time: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});


const Message =
    mongoose.models.Message ||
    mongoose.model(
        "Message",
        messageSchema
    );


// =====================================================
// GEMINI AI
// =====================================================

if (!process.env.GEMINI_API_KEY) {

    console.warn(
        "WARNING: GEMINI_API_KEY is missing from .env"
    );

}


const genAI = new GoogleGenAI({

    apiKey:
        process.env.GEMINI_API_KEY

});


console.log(
    "Gemini AI initialized"
);


// =====================================================
// POLL
// =====================================================

// ============================================
// MEETING-SPECIFIC POLLS
// ============================================

const polls = {};


let votedUsers = {};


// =====================================================
// USERS
// =====================================================

const users = {};


// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {

    console.log(
        "A user connected:",
        socket.id
    );


    // =================================================
    // JOIN MEETING
    // =================================================

    socket.on("joinMeeting", async (user) => {

    try {

        const name = user.name || "Participant";
        const role = user.role || "student";
        const regNo = user.regNo || "";

        let meetingId = user.meetingId;


        // =========================================
        // ADMIN: CREATE NEW MEETING
        // =========================================

        if (role === "admin" && !meetingId) {

            meetingId =
                await generateUniqueMeetingId();

            console.log(
                "New Meeting ID:",
                meetingId
            );

            await Meeting.create({

                meetingId: meetingId,

                createdBy: name,

                status: "active"

            });

            console.log(
                "Meeting created:",
                meetingId
            );

        }


        // =========================================
        // VALIDATE MEETING ID
        // =========================================

        if (!meetingId) {

            socket.emit(
                "meetingError",
                "Meeting ID is required."
            );

            return;
        }


        // =========================================
        // CHECK MEETING
        // =========================================

        const meeting =
            await Meeting.findOne({
                meetingId: meetingId
            });


        if (!meeting) {

            socket.emit(
                "meetingError",
                "Meeting not found."
            );

            return;
        }


        // =========================================
        // STORE USER
        // =========================================

        users[socket.id] = {

            name: name,

            role: role,

            regNo: regNo,

            meetingId: meetingId

        };


        // =========================================
        // JOIN SOCKET.IO ROOM
        // =========================================

        socket.join(meetingId);


        console.log(
            "User joined:",
            name,
            "Meeting:",
            meetingId
        );


        // =========================================
        // CHECK IF USER ALREADY VOTED
        // =========================================

        const voterId = regNo
            ? `${meetingId}:${regNo}`
            : `${meetingId}:${name}`;


        if (votedUsers[voterId]) {

            socket.emit(
                "alreadyVoted"
            );

        }


        // =========================================
        // GET CHAT HISTORY
        // =========================================

        const messages =
            await Message.find({
                meetingId: meetingId
            })
            .sort({
                createdAt: 1
            });


        // =========================================
        // SEND JOIN SUCCESS
        // =========================================

        socket.emit(
            "joinedSuccessfully"
        );


        // =========================================
        // SEND MEETING ID
        // =========================================

        socket.emit(
            "meetingId",
            meetingId
        );


        // =========================================
        // SEND CURRENT POLL
        // =========================================

        // =========================================
// SEND THIS MEETING'S POLL
// =========================================

const meetingPoll = polls[meetingId];

if (meetingPoll) {

    socket.emit(
        "currentPoll",
        meetingPoll
    );

    socket.emit(
        "voteUpdate",
        meetingPoll.votes
    );

}

        // =========================================
        // SEND CHAT HISTORY
        // =========================================

        socket.emit(
            "chatHistory",
            messages
        );


        console.log(
            "Chat history sent:",
            messages.length,
            "messages"
        );


    } catch (error) {

        console.error(
            "JOIN MEETING ERROR:",
            error
        );


        socket.emit(
            "meetingError",
            "Unable to join meeting. Check MongoDB connection."
        );

    }

});

    // =================================================
    // SEND CHAT MESSAGE
    // =================================================

    socket.on(
        "sendMessage",
        async (data) => {

            try {

                const user =
                    users[socket.id];


                // -------------------------------
                // Check user
                // -------------------------------

                if (!user) {

                    socket.emit(
                        "messageSaveError",
                        "Please join the meeting first."
                    );

                    return;
                }


                // -------------------------------
                // Support both formats
                //
                // "hello"
                //
                // OR
                //
                // { message: "hello" }
                // -------------------------------

                let messageText;


                if (
                    typeof data === "string"
                ) {

                    messageText =
                        data.trim();

                } else if (
                    data &&
                    typeof data.message === "string"
                ) {

                    messageText =
                        data.message.trim();

                } else if (
                    data &&
                    typeof data.text === "string"
                ) {

                    messageText =
                        data.text.trim();

                } else {

                    return;
                }


                if (!messageText) {

                    return;
                }


                const meetingId =
                    user.meetingId;


                // -------------------------------
                // Current time
                // -------------------------------

                const now =
                    new Date();


                const time =
                    now.toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );


                // -------------------------------
                // Save message
                // -------------------------------

                const message =
                    await Message.create({

                        meetingId:
                            meetingId,

                        name:
                            user.name ||
                            "Participant",

                        role:
                            user.role ||
                            "student",

                        regNo:
                            user.regNo ||
                            "",

                        text:
                            messageText,

                        time:
                            time

                    });


                console.log(
                    "Message saved to MongoDB:",
                    message.text
                );


                // -------------------------------
                // Send to everyone
                // in same meeting
                // -------------------------------

                io.to(
                    meetingId
                ).emit(
                    "newMessage",
                    message
                );


            } catch (error) {

                console.error(
                    "MESSAGE SAVE ERROR:",
                    error
                );


                socket.emit(
                    "messageSaveError",
                    "Unable to save message."
                );

            }

        }
    );


    // =================================================
    // VOTE
    // =================================================

   // ============================================
// VOTE
// ============================================

socket.on("vote", (option) => {

    try {

        const user =
            users[socket.id];


        if (!user) {

            socket.emit(
                "notJoined"
            );

            return;
        }


        const meetingId =
            user.meetingId;


        const poll =
            polls[meetingId];


        if (!poll) {

            socket.emit(
                "pollError",
                "No active poll for this meeting."
            );

            return;
        }


        // =====================================
        // UNIQUE VOTER ID
        // =====================================

        const voterId = user.regNo
            ? `${meetingId}:${user.regNo}`
            : `${meetingId}:${user.name}`;


        // =====================================
        // PREVENT DUPLICATE VOTE
        // =====================================

        if (votedUsers[voterId]) {

            socket.emit(
                "alreadyVoted"
            );

            return;
        }


        // =====================================
        // CHECK VALID OPTION
        // =====================================

        if (
            !poll.options.includes(option)
        ) {

            socket.emit(
                "pollError",
                "Invalid poll option."
            );

            return;
        }


        // =====================================
        // SAVE VOTE
        // =====================================

        votedUsers[voterId] = true;

        poll.votes[option]++;


        console.log(
            "Vote:",
            meetingId,
            voterId,
            option
        );


        console.log(
            "Vote results:",
            poll.votes
        );


        // =====================================
        // SEND ONLY TO THIS MEETING
        // =====================================

        io.to(meetingId).emit(
            "voteUpdate",
            poll.votes
        );


    } catch (error) {

        console.error(
            "VOTE ERROR:",
            error
        );

    }

});


    // =================================================
    // CREATE POLL
    // =================================================

    // ============================================
// CREATE POLL
// ============================================

socket.on("createPoll", (poll) => {

    try {

        const user = users[socket.id];

        if (!user) {

            socket.emit(
                "notJoined"
            );

            return;
        }


        // Only admin can create poll
        if (user.role !== "admin") {

            socket.emit(
                "notAuthorized"
            );

            return;
        }


        const meetingId =
            user.meetingId;


        if (!meetingId) {

            socket.emit(
                "meetingError",
                "Meeting ID is missing."
            );

            return;
        }


        // =====================================
        // CREATE POLL FOR THIS MEETING ONLY
        // =====================================

        const meetingVotes = {};

        poll.options.forEach((option) => {

            meetingVotes[option] = 0;

        });


        polls[meetingId] = {

            question: poll.question,

            options: poll.options,

            votes: meetingVotes

        };


        console.log(
            "Poll created for:",
            meetingId
        );

        console.log(
            polls[meetingId]
        );


        // =====================================
        // SEND ONLY TO THIS MEETING
        // =====================================

        io.to(meetingId).emit(
            "currentPoll",
            polls[meetingId]
        );


        io.to(meetingId).emit(
            "voteUpdate",
            meetingVotes
        );


        socket.emit(
            "pollCreatedSuccessfully"
        );


    } catch (error) {

        console.error(
            "CREATE POLL ERROR:",
            error
        );

        socket.emit(
            "pollError",
            "Unable to create poll."
        );

    }

});


    // =================================================
    // GENERATE AI SUMMARY
    // =================================================

    socket.on(
        "generateSummary",
        async () => {

            try {

                const user =
                    users[socket.id];


                // -------------------------------
                // Check user
                // -------------------------------

                if (!user) {

                    socket.emit(
                        "summaryError",
                        "Please join the meeting first."
                    );

                    return;
                }


                // -------------------------------
                // Meeting ID
                // -------------------------------

                const meetingId =
                    user.meetingId;


                if (!meetingId) {

                    socket.emit(
                        "summaryError",
                        "Meeting ID is missing."
                    );

                    return;
                }


                console.log(
                    "Generating summary for:",
                    meetingId
                );


                // -------------------------------
                // Get messages
                // -------------------------------

                const messages =
                    await Message.find({

                        meetingId:
                            meetingId

                    })
                    .sort({
                        createdAt: 1
                    });


                console.log(
                    "Messages found:",
                    messages.length
                );


                if (
                    messages.length === 0
                ) {

                    socket.emit(
                        "summaryError",
                        "No messages found for this meeting."
                    );

                    return;
                }


                // -------------------------------
                // Create transcript
                // -------------------------------

                const transcript =
                    messages
                        .map(
                            (message) =>
                                `${message.name}: ${message.text}`
                        )
                        .join("\n");


                console.log(
                    "Transcript:",
                    transcript
                );


                // -------------------------------
                // Gemini API key
                // -------------------------------

                if (
                    !process.env.GEMINI_API_KEY
                ) {

                    socket.emit(
                        "summaryError",
                        "GEMINI_API_KEY is missing."
                    );

                    return;
                }


                // -------------------------------
                // Prompt
                // -------------------------------

                const prompt = `

You are an AI meeting assistant.

Analyze the following meeting transcript.

Return ONLY valid JSON.

Use exactly this structure:

{
    "summary": "Short summary of the meeting",
    "keyPoints": [
        "point 1",
        "point 2"
    ],
    "decisions": [
        "decision 1"
    ],
    "actionItems": [
        {
            "person": "Person name",
            "task": "Task",
            "deadline": "Deadline or None"
        }
    ],
    "unresolvedIssues": [
        "issue 1"
    ]
}

If there are no decisions, action items, or unresolved issues,
return empty arrays.

Meeting transcript:

${transcript}

`;


                // -------------------------------
                // Gemini request
                // -------------------------------

                console.log(
                    "Sending transcript to Gemini..."
                );


                const result =
                    await genAI.models.generateContent({

                        model:
                            "gemini-2.5-flash",

                        contents:
                            prompt,

                        config: {

                            responseMimeType:
                                "application/json",

                            temperature:
                                0.2

                        }

                    });


                const text =
                    result.text;


                console.log(
                    "Raw Gemini response:",
                    text
                );


                if (!text) {

                    socket.emit(
                        "summaryError",
                        "Gemini returned an empty response."
                    );

                    return;
                }


                // -------------------------------
                // Parse JSON
                // -------------------------------

                let summary;


                try {

                    summary =
                        JSON.parse(text);

                } catch (parseError) {

                    console.error(
                        "Gemini JSON parse error:",
                        parseError
                    );

                    console.error(
                        "Gemini returned:",
                        text
                    );


                    socket.emit(
                        "summaryError",
                        "Gemini returned invalid JSON."
                    );

                    return;
                }


                // -------------------------------
                // Make sure fields exist
                // -------------------------------

                summary.summary =
                    summary.summary ||
                    "";

                summary.keyPoints =
                    Array.isArray(
                        summary.keyPoints
                    )
                        ? summary.keyPoints
                        : [];

                summary.decisions =
                    Array.isArray(
                        summary.decisions
                    )
                        ? summary.decisions
                        : [];

                summary.actionItems =
                    Array.isArray(
                        summary.actionItems
                    )
                        ? summary.actionItems
                        : [];

                summary.unresolvedIssues =
                    Array.isArray(
                        summary.unresolvedIssues
                    )
                        ? summary.unresolvedIssues
                        : [];


                // -------------------------------
                // Save summary
                // -------------------------------

                await Meeting.findOneAndUpdate(

                    {
                        meetingId:
                            meetingId
                    },

                    {

                        transcript:
                            transcript,

                        summary:
                            summary.summary,

                        keyPoints:
                            summary.keyPoints,

                        decisions:
                            summary.decisions,

                        actionItems:
                            summary.actionItems,

                        unresolvedIssues:
                            summary.unresolvedIssues,

                        status:
                            "active"

                    },

                    {
                        new: true,
                        upsert: true
                    }

                );


                console.log(
                    "AI summary saved to MongoDB:",
                    meetingId
                );


                // -------------------------------
                // Send summary to frontend
                // -------------------------------

                socket.emit(
                    "summaryGenerated",
                    summary
                );


                console.log(
                    "Summary sent to frontend."
                );


            } catch (error) {

                console.error(
                    "AI SUMMARY ERROR:",
                    error
                );


                socket.emit(
                    "summaryError",
                    error.message ||
                    "Unable to generate AI summary."
                );

            }

        }
    );


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "A user disconnected:",
                socket.id
            );


            delete users[
                socket.id
            ];

            delete votedUsers[
                socket.id
            ];

        }
    );

});


// =====================================================
// START SERVER AFTER MONGODB CONNECTS
// =====================================================

connectMongoDB()
    .then(() => {

        server.listen(
            3000,
            () => {

                console.log(
                    "Server running on port 3000"
                );

            }
        );

    });