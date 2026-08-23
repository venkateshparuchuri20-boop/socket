require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const Meeting = require("./models/Meeting");
const Message = require("./models/Message");
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


    // =====================================================
    // CREATE MEETING
    // =====================================================

    socket.on("createMeeting", async () => {

        try {

            // Find the latest meeting from MongoDB
            const lastMeeting = await Meeting.findOne()
                .sort({ meetingId: -1 });

            let nextNumber = 1;

            if (lastMeeting && lastMeeting.meetingId) {

                const lastNumber = parseInt(
                    lastMeeting.meetingId.replace("MEET", ""),
                    10
                );

                if (!Number.isNaN(lastNumber)) {

                    nextNumber = lastNumber + 1;

                }

            }


            // Generate new meeting ID
            const meetingId =
                "MEET" + String(nextNumber).padStart(3, "0");


            // Create meeting in memory
            meetings[meetingId] = {

                currentPoll: null,

                votes: {},

                votedUsers: {},

                transcript: "",

                summary: null,

                messages: []

            };


            // Make this user the admin
            users[socket.id] = {

                meetingId: meetingId,

                role: "admin",

                name: "Admin"

            };


            // Join Socket.IO room
            socket.join(meetingId);


            // Save meeting to MongoDB
            const meeting = new Meeting({

                meetingId: meetingId,

                createdBy: socket.id

            });


            await meeting.save();


            console.log(
                "Meeting saved to MongoDB:",
                meetingId
            );

            console.log(
                "Meeting created:",
                meetingId
            );

            console.log(
                "Admin assigned to meeting:",
                meetingId
            );


            // Send Meeting ID to Admin Panel
            socket.emit(
                "meetingCreated",
                meetingId
            );


        } catch (error) {

            console.error(
                "Failed to create meeting:",
                error
            );


            socket.emit(
                "meetingCreationError",
                "Failed to create meeting. Check the server terminal."
            );

        }

    });


    // =====================================================
    // JOIN MEETING
    // =====================================================

    socket.on("joinMeeting", async (user) => {

        try {

            let meeting =
                meetings[user.meetingId];


            // If meeting is not in memory,
            // check MongoDB
            if (!meeting) {

                const savedMeeting =
                    await Meeting.findOne({
                        meetingId: user.meetingId
                    });


                if (!savedMeeting) {

                    socket.emit(
                        "meetingNotFound"
                    );

                    return;

                }


                // Re-create the meeting in memory
                meeting = {

                    currentPoll: null,

                    votes: {},

                    votedUsers: {},

                    transcript: "",

                    summary: null,

                    messages: []

                };


                meetings[user.meetingId] =
                    meeting;


                console.log(
                    "Meeting loaded from MongoDB:",
                    user.meetingId
                );

            }


            // Store user information
            users[socket.id] = user;


            // Join Socket.IO room
            socket.join(user.meetingId);


            console.log(
                "User joined:",
                user
            );

            console.log(
                "Joined room:",
                user.meetingId
            );


            // Send current poll
            if (meeting.currentPoll) {

                socket.emit(
                    "currentPoll",
                    meeting.currentPoll
                );

            }


            // Send chat history
            socket.emit(
                "chatHistory",
                meeting.messages
            );


            // Send vote results
            socket.emit(
                "voteUpdate",
                meeting.votes
            );


            // Tell client that joining was successful
            socket.emit(
                "joinedSuccessfully"
            );


        } catch (error) {

            console.error(
                "Error joining meeting:",
                error
            );


            socket.emit(
                "meetingNotFound"
            );

        }

    });


    // =====================================================
    // VOTE
    // =====================================================

    socket.on("vote", (language) => {

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


        const meeting =
            meetings[meetingId];


        if (!meeting) {

            socket.emit(
                "meetingNotFound"
            );

            return;

        }


        if (!meeting.currentPoll) {

            socket.emit(
                "noPoll"
            );

            return;

        }


        const voterId =
            user.role === "student"
                ? user.regNo
                : socket.id;


        // Prevent duplicate voting
        if (meeting.votedUsers[voterId]) {

            socket.emit(
                "alreadyVoted"
            );

            return;

        }


        // Check valid option
        if (!(language in meeting.votes)) {

            socket.emit(
                "invalidOption"
            );

            return;

        }


        // Record vote
        meeting.votedUsers[voterId] =
            true;


        meeting.votes[language]++;


        console.log(
            "Vote accepted:",
            {

                meetingId: meetingId,

                voterId: voterId,

                language: language

            }
        );


        // Send updated results to everyone
        io.to(meetingId).emit(
            "voteUpdate",
            meeting.votes
        );

    });


    // =====================================================
    // CREATE POLL
    // =====================================================

    socket.on("createPoll", (poll) => {

        const user =
            users[socket.id];


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


        const meeting =
            meetings[meetingId];


        if (!meeting) {

            socket.emit(
                "meetingNotFound"
            );

            return;

        }


        // Validate question
        if (
            !poll ||
            !poll.question ||
            !poll.question.trim()
        ) {

            socket.emit(
                "invalidPoll"
            );

            return;

        }


        // Clean options
        const validOptions =
            poll.options
                .map(option => option.trim())
                .filter(option => option !== "");


        // Need at least two options
        if (validOptions.length < 2) {

            socket.emit(
                "invalidPoll"
            );

            return;

        }


        // Store poll
        meeting.currentPoll = {

            question:
                poll.question.trim(),

            options:
                validOptions

        };


        // Reset votes
        meeting.votes = {};


        validOptions.forEach((option) => {

            meeting.votes[option] = 0;

        });


        // Reset voters
        meeting.votedUsers = {};


        console.log(
            "New poll created for:",
            meetingId
        );


        console.log(
            "Poll:",
            meeting.currentPoll
        );


        console.log(
            "Votes:",
            meeting.votes
        );


        // Send poll to everyone
        io.to(meetingId).emit(
            "currentPoll",
            meeting.currentPoll
        );


        // Send initial results
        io.to(meetingId).emit(
            "voteUpdate",
            meeting.votes
        );

    });


    // =====================================================
    // SEND MESSAGE
    // =====================================================

    socket.on("sendMessage", async (messageText) => {

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


        const meeting =
            meetings[meetingId];


        if (!meeting) {

            socket.emit(
                "meetingNotFound"
            );

            return;

        }


        const text =
            messageText.trim();


        if (text === "") {

            return;

        }


        const message = {

            name: user.name,

            role: user.role,

            text: text,

            time:
                new Date().toLocaleTimeString()

        };


        try {

            // Save message to MongoDB
            const newMessage =
                new Message({

                    meetingId: meetingId,

                    name: user.name,

                    role: user.role,

                    text: text

                });


            await newMessage.save();


            // Store message in memory
            meeting.messages.push(
                message
            );


            console.log(
                "Message saved to MongoDB:",
                {

                    meetingId: meetingId,

                    name: user.name,

                    text: text

                }
            );


            // Send message to everyone
            io.to(meetingId).emit(
                "newMessage",
                message
            );


        } catch (error) {

            console.error(
                "Failed to save message:",
                error
            );


            socket.emit(
                "messageSaveError",
                "Message could not be saved."
            );

        }

    });



    socket.on("generateSummary", async () => {

        const user =
            users[socket.id];


        if (!user) {

            socket.emit(
                "notJoined"
            );

            return;

        }


       
        if (user.role !== "admin") {

            socket.emit(
                "notAuthorized"
            );

            return;

        }


        const meetingId =
            user.meetingId;


        const meeting =
            meetings[meetingId];


        if (!meeting) {

            socket.emit(
                "meetingNotFound"
            );

            return;

        }


        if (meeting.messages.length === 0) {

            socket.emit(
                "emptyTranscript"
            );

            return;

        }


       
        const transcript =
            meeting.messages

                .map(message => {

                    return `${message.name}: ${message.text}`;

                })

                .join("\n");


        console.log(
            "Generating AI summary for:",
            meetingId
        );


        console.log(
            "Transcript:",
            transcript
        );


        try {

            const summary =
                await generateSummary(
                    transcript
                );


            meeting.transcript =
                transcript;


            meeting.summary =
                summary;
                await Meeting.findOneAndUpdate(
    { meetingId: meetingId },
    {
        transcript: transcript,
        summary: summary
    }
);

            console.log(
                "AI summary generated for:",
                meetingId
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



mongoose.connect(
    process.env.MONGO_URI
)

.then(() => {

    console.log(
        "MongoDB connected"
    );

})

.catch((error) => {

    console.error(
        "MongoDB connection error:",
        error
    );

});



server.listen(3000, () => {

    console.log(
        "Server running on port 3000"
    );

});