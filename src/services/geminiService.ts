import { GoogleGenAI, Type } from "@google/genai";
import { ComplianceCheck, TemplateCategory } from "../types";

// Always use the API key directly from process.env.API_KEY as per coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkCompliance = async (text: string, category: TemplateCategory): Promise<ComplianceCheck> => {
  const prompt = `Analyze this WhatsApp message template for compliance with Meta's Official WhatsApp Business Policy.
  Category: ${category}
  Content: "${text}"
  Provide a score from 0 to 100, boolean isCompliant, suggestions, and policy warnings in JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          isCompliant: { type: Type.BOOLEAN },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "isCompliant", "suggestions", "warnings"]
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    return { score: 0, isCompliant: false, suggestions: ["Error AI"], warnings: ["Check connection"] };
  }
};
