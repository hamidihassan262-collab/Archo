import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from "@google/genai";

const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY;
const PINECONE_INDEX = import.meta.env.VITE_PINECONE_INDEX || 'archo-mortgage';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const pinecone = PINECONE_API_KEY ? new Pinecone({
  apiKey: PINECONE_API_KEY,
}) : null;

export async function queryPinecone(query: string, topK: number = 3) {
  if (!pinecone || !GEMINI_API_KEY) {
    console.warn('Pinecone or Gemini API key missing. Skipping vector search.');
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const embeddingResult = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: [query],
    });

    const vector = embeddingResult.embeddings[0].values;
    const index = pinecone.index(PINECONE_INDEX);
    
    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata as { lender: string; text: string; category: string }
    }));
  } catch (error) {
    console.error('Pinecone query error:', error);
    return [];
  }
}
