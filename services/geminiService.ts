import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeClothingImage = async (base64Image: string): Promise<{ color: string; description: string }> => {
  try {
    const ai = getAiClient();
    
    // Clean base64 string if it contains metadata header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const prompt = "Analise esta imagem de uma peça de roupa. Identifique a cor principal (em português, uma palavra) e forneça uma descrição curta e comercial (máximo 10 palavras).";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            color: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["color", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};