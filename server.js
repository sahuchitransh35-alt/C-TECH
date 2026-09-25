const express = require("express");
const path = require("path");
const { Readable } = require("stream");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ==========================================
// GEMINI CHAT - STREAMING
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
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse";

        const requestBody = {
            systemInstruction: {
                parts: [
                    {
                        text:
                            "You are C-TECH AI, a helpful, friendly and intelligent AI assistant. " +
                            "Answer the user's questions clearly and directly. " +
                            "You can understand Hindi, Hinglish and English. " +
                            "Keep answers useful and easy to understand."
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

        const response = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },

            body: JSON.stringify(requestBody)
        });

        // ------------------------------------------
        // If Gemini returns an error
        // ------------------------------------------

        if (!response.ok) {
            const errorText = await response.text();

            console.error("GEMINI ERROR:", errorText);

            return res.status(response.status).json({
                error: "Gemini API Error",
                details: errorText
            });
        }

        // ------------------------------------------
        // STREAM RESPONSE TO BROWSER
        // ------------------------------------------

        res.status(200);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        if (!response.body) {
            return res.end();
        }

        const stream = Readable.fromWeb(response.body);

        stream.on("error", (error) => {
            console.error("STREAM ERROR:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    error: "Streaming error"
                });
            } else {
                res.end();
            }
        });

        stream.pipe(res);

    } catch (error) {

        console.error("CHAT ERROR:", error);

        if (!res.headersSent) {
            res.status(500).json({
                error: error.message || "Something went wrong"
            });
        } else {
            res.end();
        }
    }
});


// ==========================================
// IMAGE GENERATION
// ==========================================

app.post("/api/image", async (req, res) => {

    try {

        const prompt = req.body.prompt;

        if (!prompt) {
            return res.status(400).json({
                error: "Image prompt is required"
            });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }

        const url =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent";

        const requestBody = {

            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]

        };

        const response = await fetch(url, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },

            body: JSON.stringify(requestBody)

        });

        const data = await response.json();

        if (!response.ok) {

            console.error("IMAGE ERROR:", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Image generation failed"
            });

        }

        const parts =
            data?.candidates?.[0]?.content?.parts || [];

        const imagePart =
            parts.find(
                part => part.inlineData
            );

        if (!imagePart) {

            return res.status(500).json({
                error: "No image was returned by Gemini"
            });

        }

        return res.json({

            image:
                imagePart.inlineData.data,

            mimeType:
                imagePart.inlineData.mimeType

        });

    } catch (error) {

        console.error("IMAGE ERROR:", error);

        return res.status(500).json({
            error: error.message ||
                "Image generation failed"
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
