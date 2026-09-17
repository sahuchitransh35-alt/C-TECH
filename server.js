const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Online hosting + localhost dono ke liye
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));


// ==========================================
// GEMINI TEXT AI
// ==========================================

async function askGemini(message) {

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY
            },

            body: JSON.stringify({

                systemInstruction: {
                    parts: [
                        {
                            text: `
You are C-TECH AI, a helpful and intelligent AI assistant.

Answer the user's actual question directly.
Do not use fixed answers.
Understand Hindi, Hinglish and English.
Keep answers clear and useful.
`
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
                    temperature: 0.3
                }

            })
        }
    );

    const data = await response.json();

    console.log("TEXT RESPONSE:", data);

    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            "Gemini API error"
        );

    }

    const answer =
        data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {

        throw new Error(
            "Gemini ne koi answer nahi diya."
        );

    }

    return answer;
}


// ==========================================
// CHAT API
// ==========================================

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message) {

            return res.status(400).json({
                error: "Message is required"
            });

        }


        // API KEY CHECK
        if (!process.env.GEMINI_API_KEY) {

            return res.status(500).json({
                error:
                    "GEMINI_API_KEY nahi mili. .env file check karo."
            });

        }


        // AI se answer lo
        const answer =
            await askGemini(message);


        // Answer frontend ko bhejo
        res.json({
            answer: answer
        });


    } catch (error) {

        console.error("CHAT ERROR:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


// ==========================================
// IMAGE GENERATION API
// ==========================================

app.post("/api/image", async (req, res) => {

    try {

        const prompt = req.body.prompt;


        if (!prompt) {

            return res.status(400).json({
                error: "Image prompt is required"
            });

        }


        // API KEY CHECK
        if (!process.env.GEMINI_API_KEY) {

            return res.status(500).json({
                error:
                    "GEMINI_API_KEY nahi mili. .env file check karo."
            });

        }


        console.log(
            "Generating image:",
            prompt
        );


        const response = await fetch(

            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "x-goog-api-key":
                        process.env.GEMINI_API_KEY

                },

                body: JSON.stringify({

                    contents: [

                        {

                            parts: [

                                {
                                    text: prompt
                                }

                            ]

                        }

                    ],

                    generationConfig: {

                        responseModalities: [
                            "IMAGE"
                        ]

                    }

                })

            }

        );


        const data =
            await response.json();


        console.log(
            "IMAGE RESPONSE RECEIVED"
        );


        if (!response.ok) {

            console.error(data);

            return res.status(response.status).json({

                error:
                    data.error?.message ||
                    "Image generation failed"

            });

        }


        const parts =
            data.candidates?.[0]
                ?.content?.parts || [];


        const imagePart =
            parts.find(
                part => part.inlineData
            );


        if (!imagePart) {

            return res.status(500).json({

                error:
                    "Gemini ne image return nahi ki."

            });

        }


        const imageData =
            imagePart.inlineData.data;


        const mimeType =
            imagePart.inlineData.mimeType ||
            "image/png";


        res.json({

            image: imageData,

            mimeType: mimeType

        });


    } catch (error) {

        console.error(
            "IMAGE ERROR:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log(
        "================================="
    );

    console.log(
        "       C-TECH AI IS RUNNING"
    );

    console.log(
        "================================="
    );

    console.log("");

    console.log(
        `Port: ${PORT}`
    );

    console.log("");

});