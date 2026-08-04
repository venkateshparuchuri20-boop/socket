const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);


const io = new Server(server);
let currentPoll = {

    question: "Which language do you prefer?",

    options: [

        "Python",

        "Java",

        "C++"

    ]

};
let votes = {

    Python: 0,

    Java: 0,

    "C++": 0

};
let votedUsers = {};
let users = {};

io.on("connection", (socket) => {
    socket.on("joinMeeting", (user) => {

    users[socket.id] = user;

    console.log(users);

    socket.emit("joinedSuccessfully");

});
    console.log("A user connected!");
    socket.emit("currentPoll", currentPoll);
    socket.on("vote", (language) => {

    if (votedUsers[socket.id]) {

        socket.emit("alreadyVoted");
        return;

    }

    votedUsers[socket.id] = true;

    votes[language]++;

    console.log(votes);

    io.emit("voteUpdate", votes);

});
   

    socket.on("disconnect", () => {
        console.log("A user disconnected!");
    });

    socket.on("createPoll", (poll) => {
        votedUsers = {};

    currentPoll = poll;

    votes = {};

    poll.options.forEach((option) => {
        votes[option] = 0;
    });

    io.emit("currentPoll", currentPoll);

    io.emit("voteUpdate", votes);

});


});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
