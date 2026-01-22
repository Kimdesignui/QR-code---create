
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getSmartContext = async (url: string): Promise<AISuggestion> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this URL and suggest a professional title, a short catchy description (max 15 words), and a HEX color that matches its brand vibe: ${url}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedColor: { type: Type.STRING, description: "HEX color code starting with #" },
          },
          required: ["title", "description", "suggestedColor"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Gemini context error:", error);
    return {
      title: "New QR Code",
      description: "Scan to open the link.",
      suggestedColor: "#000000",
    };
  }
};
