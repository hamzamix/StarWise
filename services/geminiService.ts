
import { GoogleGenAI, Type } from "@google/genai";
import { Repository } from "../types";

// IMPORTANT: In a real-world application, the API key should be handled on a secure backend server.
// It is exposed here on the client-side for demonstration purposes only.
// The environment variable is assumed to be set in the deployment environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to disable AI features or show a message.
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        tags: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: 'A relevant, concise, lowercase tag for the repository.'
            },
            description: 'A list of 3 to 5 suggested tags.'
        }
    },
    required: ['tags'],
};

export const suggestTagsForRepo = async (repo: Repository): Promise<string[]> => {
    if (!API_KEY) {
        // Return mock tags if API key is not available
        return new Promise(resolve => setTimeout(() => resolve(['mock', 'ai-disabled']), 500));
    }

    const prompt = `
        Analyze the following GitHub repository metadata and suggest 3-5 relevant, concise, single-word or two-word (kebab-case) tags.
        Tags should be lowercase.
        Prioritize tags that describe the project's purpose, technology, and domain.

        Repository Name: ${repo.name}
        Description: ${repo.description || 'No description provided.'}
        Language: ${repo.language || 'Not specified.'}
        Topics: ${repo.topics.join(', ') || 'No topics provided.'}

        Generate a JSON object with a "tags" array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.3,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result && Array.isArray(result.tags)) {
            return result.tags;
        }

        return [];

    } catch (error) {
        console.error("Error generating tags with Gemini API:", error);
        // Fallback or error handling
        return [];
    }
};
