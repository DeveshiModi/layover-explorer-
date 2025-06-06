const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Root route handler
app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.json({ message: "Color Palette Generator API is running" });
});

app.post("/api/colors", async (req, res) => {
  console.log("Received color generation request:", req.body);
  
  try {
    if (!req.body.prompt) {
      console.log("No prompt provided");
      return res.status(400).json({ error: "Prompt is required" });
    }

    const userPrompt = req.body.prompt;
    const style = req.body.style || 'modern'; // Default to modern if not specified
    console.log("Generating colors for prompt:", userPrompt, "with style:", style);

    const stylePrompts = {
      modern: "Use modern, trendy, and visually appealing color combinations.",
      vintage: "Use retro-inspired colors with a nostalgic feel, like muted pastels and earthy tones.",
      neon: "Use vibrant, high-contrast neon colors that pop and glow.",
      pastel: "Use soft, gentle pastel colors that are easy on the eyes.",
      monochrome: "Use variations of a single color, creating a sophisticated and cohesive look.",
      gradient: "Use colors that work well together in gradients, with smooth transitions.",
      complementary: "Use colors that are opposite on the color wheel for high contrast.",
      analogous: "Use colors that are next to each other on the color wheel for harmony.",
      triadic: "Use three colors equally spaced on the color wheel for balance.",
      tetradic: "Use four colors arranged into two complementary pairs for richness."
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional color palette designer. Given a description, return ONLY a JSON array of 5 hex colors (no names, no extra text, no markdown).
The palette must match the mood, style, or theme described in the userPrompt. ${stylePrompts[style]}

DO NOT use brown, grey, brownish-orange, or black under ANY circumstances unless the user prompt explicitly requests those colors by name.
If the prompt is a person's name Do NOT use brown, grey, or black for names.
If you cannot find a 4th or 5th matching color, repeat a shade of one of the other colors instead of generating a new, unrelated color.

If the prompt is a noun, name, or place and is ambiguous, first find the meaning or origin of the word and use colors related to its meaning or symbolism.
If the prompt is a noun or place, use colors commonly associated with it.
If it's a college or university, use its official school colors.
If it's a season, use colors that represent that season's natural elements.
If it's a time of day, use colors that represent that time's lighting and atmosphere.
If it's a weather condition, use colors that represent that weather's visual appearance.
If it's a food or drink, use colors that represent its natural appearance.
If it's an emotion, use colors that are psychologically associated with that emotion.
If it's a holiday, use colors traditionally associated with that holiday.
If it's a profession, use colors associated with that profession's uniforms or tools.
If it's a sport, use colors associated with that sport's equipment or uniforms.
If it's a musical genre, use colors that represent that genre's visual aesthetic.
If it's a movie genre, use colors that represent that genre's typical color grading.
If it's a social media platform, use colors from its brand identity.
If it's a tech company, use colors from its brand identity.
If it's a country, use colors from its flag or national symbols.
If it's a city, use colors that represent its architecture, nature, or culture.
If it's a natural phenomenon, use colors that represent its visual appearance.
If it's a man-made structure, use colors that represent its materials or purpose.

Here are some examples:

Example 1 (Pastel Dream): ["#F2D7EE", "#D7B9D5", "#957DAD", "#6D6875", "#B5838D"]
Example 2 (Holographic): ["#A7C7E7", "#B4F8C8", "#FBE7C6", "#F7B7A3", "#EA5C5A"]
Example 3 (Vibrant Sunset): ["#FF6F61", "#FFB88C", "#FFD6E0", "#A2D5F2", "#0779E4"]
Example 4 (Earthy Calm): ["#A3C1AD", "#B5B682", "#F7DD72", "#E2B07A", "#D08C60"]
Example 5 (Minimalist Monochrome): ["#22223B", "#4A4E69", "#9A8C98", "#C9ADA7", "#F2E9E4"]
Example 6 (Neon Glow): ["#39FF14", "#F72585", "#7209B7", "#3A86FF", "#FFBE0B"]
Example 7 (Soft Holographic): ["#E0C3FC", "#B6E0FE", "#FBC2EB", "#FEE2F8", "#C9FFFA"]
Example 8 (Muted Autumn): ["#D9BF77", "#A97C50", "#6B4226", "#A26769", "#CEB5A7"]
Example 9 (Retro Pop): ["#FFB347", "#FF6961", "#CB99C9", "#AEC6CF", "#77DD77"]
Example 10 (Ocean Breeze): ["#A2D5C6", "#077B8A", "#5C3C92", "#FFB6B9", "#FAE3D9"]

Description: "${userPrompt}"
Return ONLY the JSON array of 5 hex colors, nothing else.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", await geminiResponse.text());
      throw new Error(`Gemini API responded with status: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    console.log("Gemini API response:", data);

    // Extract the text content from the response
    const content = data.candidates[0].content.parts[0].text;
    console.log("Raw content:", content);

    // Clean up the response - remove any markdown formatting
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    console.log("Cleaned content:", cleanedContent);

    try {
      const colors = JSON.parse(cleanedContent);
      console.log("Parsed colors:", colors);
      res.json({ colors });
    } catch (parseError) {
      console.error("Failed to parse colors:", parseError);
      throw new Error("Failed to parse color palette from response");
    }
  } catch (error) {
    console.error("Error in /api/colors:", error);
    res.status(500).json({ error: "Something went wrong with Gemini API." });
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const modelsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    const modelsData = await modelsRes.json();
    console.log("📦 Available models:", JSON.stringify(modelsData, null, 2));
    res.json(modelsData);
  } catch (err) {
    console.error("❌ Model fetch error:", err);
    res.status(500).send("Model listing failed.");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Gemini proxy server running at http://localhost:${PORT}`);
  console.log("CORS enabled for all localhost ports");
});

