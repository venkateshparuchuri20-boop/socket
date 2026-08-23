require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateSummary(transcript) {

    const prompt = `
You are an AI meeting assistant.

Analyze this meeting transcript and extract the important information.

Return ONLY valid JSON in exactly this structure:

{
  "summary": "short meeting summary",
  "keyPoints": [
    "important point 1",
    "important point 2"
  ],
  "decisions": [
    "decision 1"
  ],
  "actionItems": [
    {
      "person": "person name or Team",
      "task": "task description",
      "deadline": "deadline or None"
    }
  ],
  "unresolvedIssues": [
    "unresolved issue"
  ]
}

Rules:
- Do not invent information.
- If no decision exists, return an empty array.
- If no action item exists, return an empty array.
- If no unresolved issue exists, return an empty array.
- Keep the summary concise.
- Return ONLY JSON.
- Do not use markdown code fences.

MEETING TRANSCRIPT:
${transcript}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text);
}

module.exports = { generateSummary };