import { GoogleGenAI, Type } from "@google/genai";
import { ComplianceCheck, TemplateCategory } from "../types";

// Always use the API key directly from process.env.API_KEY as per coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const checkCompliance = async (text: string, category: TemplateCategory): Promise<ComplianceCheck> => {
  const prompt = `Analyze this WhatsApp message template for compliance with Meta's Official WhatsApp Business Policy.
  Category: ${category}
  Content: "${text}"
  
  Guidelines to consider:
  1. Explicit opt-in required.
  2. No prohibited content (drugs, gambling, adult, etc.).
  3. No "cold" outreach without clear value or previous interaction.
  4. Accuracy of category.
  5. Avoid excessive capitalization or spammy formatting.
  
  Provide a score from 0 to 100, boolean isCompliant, suggestions for improvement, and any specific policy warnings.`;

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
    return {
      score: 0,
      isCompliant: false,
      suggestions: ["Failed to parse AI response. Check connection."],
      warnings: ["Error validating policy."]
    };
  }
};

export const optimizeTemplate = async (draft: string, category: TemplateCategory): Promise<string> => {
  const prompt = `Rewrite the following WhatsApp message draft to be more professional, engaging, and fully compliant with Meta Business Policies for the category: ${category}. Use placeholders like {{1}}, {{2}} for dynamic data.
  Draft: "${draft}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || draft;
};
