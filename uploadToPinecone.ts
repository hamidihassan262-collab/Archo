import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();

const PINECONE_API_KEY = process.env.VITE_PINECONE_API_KEY;
const PINECONE_INDEX = process.env.VITE_PINECONE_INDEX || 'archo-mortgage';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const knowledgeBase = [
  { lender: 'Accord Mortgages', category: 'Self-Employed', text: 'Accord Mortgages requires 2 years accounts for self-employed applicants. They will consider 1 year with a strong projection from a qualified accountant.' },
  { lender: 'Accord Mortgages', category: 'Adverse Credit', text: 'Accord has a strict adverse credit policy. No CCJs or defaults in the last 3 years are generally allowed.' },
  { lender: 'NatWest', category: 'Self-Employed', text: 'NatWest uses an average of the last 2 years for self-employed income. They can consider 1 year for specific professional roles like doctors or lawyers.' },
  { lender: 'NatWest', category: 'Adverse Credit', text: 'NatWest assesses adverse credit on a case-by-case basis. Small defaults (under £500) may be ignored if they are satisfied.' },
  { lender: 'The Mortgage Works', category: 'BTL', text: 'TMW focuses on Buy-to-Let. They have no minimum income requirement for experienced landlords, but require £25k for first-time landlords.' },
  { lender: 'Halifax', category: 'Self-Employed', text: 'Halifax is very flexible for self-employed. They often use the latest year\'s figures rather than an average if the business is growing.' },
  { lender: 'Halifax', category: 'Adverse Credit', text: 'Halifax uses credit scoring. They have a high tolerance for minor historical credit issues if the overall score is strong.' }
];

async function upload() {
  if (!PINECONE_API_KEY || !GEMINI_API_KEY) {
    console.error('Missing API keys in environment variables.');
    process.exit(1);
  }

  console.log('Initializing Pinecone and Gemini...');
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const index = pc.index(PINECONE_INDEX);

  console.log(`Uploading ${knowledgeBase.length} records to index: ${PINECONE_INDEX}...`);

  for (let i = 0; i < knowledgeBase.length; i++) {
    const item = knowledgeBase[i];
    console.log(`Processing [${i+1}/${knowledgeBase.length}]: ${item.lender} - ${item.category}`);
    
    const embeddingResult = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: [item.text],
    });

    const values = embeddingResult.embeddings[0].values;

    await index.upsert({
      records: [{
        id: `kb-${i}`,
        values,
        metadata: item
      }]
    });
  }

  console.log('Upload complete!');
}

upload().catch(console.error);
