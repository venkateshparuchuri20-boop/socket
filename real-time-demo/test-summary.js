const { generateSummary } = require("./ai-summarizer");

const transcript = `
Rahul: We need to complete the login module by Friday.
Priya: I will test the module on Saturday.
Amit: We decided to use Firebase authentication.
Rahul: We should also prepare the final documentation.
`;

generateSummary(transcript)
    .then(summary => {
        console.log("\n===== MEETING SUMMARY =====\n");
        console.log(JSON.stringify(summary, null, 2));
    })
    .catch(error => {
        console.error("Error:", error.message);
    });