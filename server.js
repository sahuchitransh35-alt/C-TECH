const express = require("express");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-3.5-flash";

// ==========================================
// WAIT FUNCTION
// ==========================================

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ==========================================
// GEMINI CHAT
// ==========================================

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message) {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing on server"
            });
        }


        const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;


        const requestBody = {

            systemInstruction: {
                parts: [
                    {
                        text:
                            "You are C-TECH AI, a helpful, friendly and intelligent AI assistant. " +
                            "Answer the user's questions clearly and directly. " +
                            "You understand Hindi, Hinglish and English. " +
                            "Keep answers useful, natural and easy to understand."
                    }
                ]
            },

            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: message
                        }
                    ]
                }
            ],

            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
            }

        };


        // ==========================================
        // RETRY SYSTEM
        // ==========================================

        const maxAttempts = 3;

        let response;
        let lastError = "";


        for (let attempt = 1; attempt <= maxAttempts; attempt++) {

            console.log(
                `Gemini request attempt ${attempt}/${maxAttempts}`
            );


            response = await fetch(url, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY
                },

                body: JSON.stringify(requestBody)

            });


            // SUCCESS
            if (response.ok) {
                break;
            }


            lastError = await response.text();

            console.error(
                `Gemini attempt ${attempt} failed:`,
                lastError
            );


            // Retry only temporary/server errors
            if (
                response.status !== 503 &&
                response.status !== 429 &&
                response.status !== 500 &&
                response.status !== 502 &&
                response.status !== 504
            ) {
                break;
            }


            // Don't wait after final attempt
            if (attempt < maxAttempts) {

                const delay =
                    Math.pow(2, attempt) * 1000;

                console.log(
                    `Retrying Gemini in ${delay / 1000} seconds...`
                );

                await wait(delay);
            }

        }


        // ==========================================
        // GEMINI STILL FAILED
        // ==========================================

        if (!response.ok) {

            console.error(
                "GEMINI FINAL ERROR:",
                lastError
            );

            return res.status(response.status).json({

                error:
                    "Gemini API temporarily unavailable.",

                details:
                    lastError

            });

        }


        // ==========================================
        // READ GEMINI RESPONSE
        // ==========================================

        const data = await response.json();


        const answer =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();


        if (!answer) {

            console.error(
                "Unexpected Gemini response:",
                JSON.stringify(data)
            );

            return res.status(500).json({
                error: "Gemini returned an empty response."
            });

        }


        // ==========================================
        // SEND ANSWER TO WEBSITE
        // ==========================================

        return res.json({
            answer: answer
        });


    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error
        );

        return res.status(500).json({

            error:
                error.message ||
                "Something went wrong."

        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `C-TECH AI running on port ${PORT}`
    );

});
