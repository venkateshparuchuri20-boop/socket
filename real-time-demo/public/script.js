const socket = io();
document.getElementById("joinBtn").addEventListener("click", () => {

    const name = document.getElementById("name").value.trim();

    const role = document.getElementById("role").value;

    const regNo = document.getElementById("regNo").value.trim();

    // Student must enter registration number
    if (role === "student" && regNo === "") {
        alert("Please enter your Registration Number.");
        return;
    }

    socket.emit("joinMeeting", {
        name,
        role,
        regNo
    });

});

console.log("Connected to Socket.IO");

socket.on("connect", () => {
    console.log("Socket Connected");
});
document.getElementById("joinBtn").addEventListener("click", () => {

    const name = document.getElementById("name").value;

    const role = document.getElementById("role").value;

    const regNo = document.getElementById("regNo").value;

    socket.emit("joinMeeting", {

        name,

        role,

        regNo

    });

});

document.getElementById("voteBtn").addEventListener("click", () => {

    const selected = document.querySelector('input[name="language"]:checked');

    if(selected){

        socket.emit("vote", selected.value);

    }
    else{

        alert("Please select one option.");

    }

});
socket.on("voteUpdate", (votes) => {
const resultsDiv = document.getElementById("results");

resultsDiv.innerHTML = "";

for (let option in votes) {

    resultsDiv.innerHTML += `
        <p>${option} : ${votes[option]}</p>
    `;

}

});
socket.on("currentPoll", (poll) => {

    
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
    socket.on("joinedSuccessfully", () => {

    document.getElementById("joinScreen").style.display = "none";

    document.getElementById("pollScreen").style.display = "block";

});
    socket.on("joinedSuccessfully", () => {

    document.getElementById("joinScreen").style.display = "none";

    document.getElementById("pollScreen").style.display = "block";

});

    socket.on("alreadyVoted", () => {

    alert("You have already voted!");

});

});