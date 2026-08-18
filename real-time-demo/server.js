const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { generateSummary } = require("./ai-summarizer");

const app = express();

app.use(express.static("public"));

const server = http.createServer(app);

const io = new Server(server);

let meetings = {};

let users = {};

io.on("connection", (socket) => {

    console.log("A user connected!");

    socket.on("createMeeting", () => {

        const meetingId = "MEET" + String(
            Object.keys(meetings).length + 1
        ).padStart(3, "0");

        meetings[meetingId] = {

    currentPoll: null,

    votes: {},

    votedUsers: {},

    transcript: "",

    summary: null

};
        users[socket.id] = {

            meetingId: meetingId,

            role: "admin"

        };

        console.log("Meeting created:", meetingId);

        console.log(
            "Admin assigned to meeting:",
            meetingId
        );

        socket.emit(
            "meetingCreated",
            meetingId
        );

    });

    socket.on("joinMeeting", (user) => {

        users[socket.id] = user;

        socket.join(user.meetingId);

        console.log("User joined:", user);

        console.log(
            "Joined room:",
            user.meetingId
        );

        const meeting = meetings[user.meetingId];

        if (meeting) {

            if (meeting.currentPoll) {

                socket.emit(
                    "currentPoll",
                    meeting.currentPoll
                );

            }

            socket.emit(
                "voteUpdate",
                meeting.votes
            );

            socket.emit(
                "joinedSuccessfully"
            );

        } else {

            socket.emit(
                "meetingNotFound"
            );

        }

    });

    socket.on("vote", (language) => {

        const user = users[socket.id];

        if (!user) {

            socket.emit("notJoined");

            return;

        }

        const meetingId = user.meetingId;

        const meeting = meetings[meetingId];

        if (!meeting) {

            socket.emit("meetingNotFound");

            return;

        }

        if (!meeting.currentPoll) {

            socket.emit("noPoll");

            return;

        }

        const voterId = user.role === "student"
            ? user.regNo
            : socket.id;

        if (meeting.votedUsers[voterId]) {

            socket.emit("alreadyVoted");

            return;

        }

        if (!(language in meeting.votes)) {

            socket.emit("invalidOption");

            return;

        }

        meeting.votedUsers[voterId] = true;

        meeting.votes[language]++;

        console.log("Vote accepted:", {

            meetingId: meetingId,

            voterId: voterId,

            language: language

        });

        io.to(meetingId).emit(
            "voteUpdate",
            meeting.votes
        );

    });

    socket.on("createPoll", (poll) => {

        const user = users[socket.id];

        if (!user) {

            socket.emit("notJoined");

            return;

        }

        const meetingId = user.meetingId;

        const meeting = meetings[meetingId];

        if (!meeting) {

            socket.emit("meetingNotFound");

            return;

        }

        if (!poll.question.trim()) {

            socket.emit("invalidPoll");

            return;

        }

        meeting.currentPoll = poll;

        meeting.votes = {};

        poll.options.forEach((option) => {

            if (option.trim() !== "") {

                meeting.votes[option] = 0;

            }

        });

        meeting.votedUsers = {};

        console.log(
            "New poll created for:",
            meetingId
        );

        console.log(
            "Poll:",
            poll
        );

        io.to(meetingId).emit(
            "currentPoll",
            meeting.currentPoll
        );

        io.to(meetingId).emit(
            "voteUpdate",
            meeting.votes
        );

    });
    socket.on("generateSummary", async (transcript) => {

    const user = users[socket.id];

    if (!user) {

        socket.emit("notJoined");

        return;

    }

    if (user.role !== "admin") {

        socket.emit("notAuthorized");

        return;

    }

    const meetingId = user.meetingId;

    const meeting = meetings[meetingId];

    if (!meeting) {

        socket.emit("meetingNotFound");

        return;

    }

    if (!transcript || transcript.trim() === "") {

        socket.emit("emptyTranscript");

        return;

    }

    try {

        meeting.transcript = transcript;

        const summary = await generateSummary(transcript);

        meeting.summary = summary;

        console.log(
    "AI summary generated for:",
    meetingId
);

console.log(
    "AI SUMMARY:",
    JSON.stringify(summary, null, 2)
);

        socket.emit(
            "summaryGenerated",
            summary
        );

    } catch (error) {

        console.error(
            "AI summary error:",
            error
        );

        socket.emit(
            "summaryError",
            "Failed to generate AI summary."
        );

    }

});

    socket.on("disconnect", () => {

        console.log(
            "A user disconnected:",
            socket.id
        );

        delete users[socket.id];

    });

});

server.listen(3000, () => {

    console.log(
        "Server running on port 3000"
    );

});