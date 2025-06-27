// File: api/explain.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// This line securely accesses the environment variable you already set in Vercel.
// Make sure the name 'GEMINI_API_KEY' matches the name you used in Vercel.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// This is the main serverless function that Vercel will run.
module.exports = async (req, res) => {
  // Set CORS headers to allow your frontend to call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight requests from the browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ error: 'Tag is required.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `You are an expert assistant for AI image generation. Explain the Danbooru tag "${tag}" in the context of creating images with text-to-image models like Stable Diffusion. Keep the explanation concise, helpful, and easy to understand (2-3 sentences max).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();

    // Send the successful response back to your script.js
    res.status(200).json({ explanation });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to get explanation from Gemini API.' });
  }
};
