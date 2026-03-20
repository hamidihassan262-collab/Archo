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
  { lender: 'Halifax', category: 'Adverse Credit', text: 'Halifax uses credit scoring. They have a high tolerance for minor historical credit issues if the overall score is strong.' },
  { lender: 'Kensington Mortgages', category: 'Self-Employed', text: 'Kensington accepts 1 year trading history. They use profit before tax for limited company directors, which is highly beneficial for tax-efficient earners.' },
  { lender: 'Kensington Mortgages', category: 'Adverse Credit', text: 'Kensington is a specialist lender. They accept CCJs and defaults even if registered within the last 12 months, provided they are not on the same credit line.' },
  { lender: 'Precise Mortgages', category: 'Self-Employed', text: 'Precise accepts 1 year trading history. They are excellent for complex income streams, including multiple sources of income and variable pay.' },
  { lender: 'Precise Mortgages', category: 'Adverse Credit', text: 'Precise considers heavy adverse credit, including Debt Management Plans (DMPs) and historic bankruptcies. They have a tiered product range based on the severity of the credit issues.' },
  { lender: 'Bluestone Mortgages', category: 'Self-Employed', text: 'Bluestone accepts 1 year trading history. They will consider affordability based on the most recent 3 months of bank statements for some applicants.' },
  { lender: 'Bluestone Mortgages', category: 'Adverse Credit', text: 'Bluestone uses manual underwriting and does not credit score. They consider very recent adverse credit, including defaults and CCJs registered in the last 6 months.' },
  { lender: 'Pepper Money', category: 'Self-Employed', text: 'Pepper Money accepts 1 year trading history and uses the latest year\'s figures. This is excellent for businesses with fluctuating income.' },
  { lender: 'Pepper Money', category: 'Adverse Credit', text: 'Pepper Money does not use credit scores. They have transparent criteria for defaults and CCJs, with specific products for different credit tiers.' },
  { lender: 'Santander', category: 'Self-Employed', text: 'Santander usually requires 2 years of accounts. They use an average of the last 2 years or the latest year, whichever is lower.' },
  { lender: 'Santander', category: 'Adverse Credit', text: 'Santander is generally conservative with adverse credit. They require CCJs and defaults to be satisfied for at least 3 years.' },
  { lender: 'Barclays', category: 'Self-Employed', text: 'Barclays requires 2 years of trading history. They are good for high-net-worth individuals and complex corporate structures.' },
  { lender: 'Barclays', category: 'Adverse Credit', text: 'Barclays has a low tolerance for adverse credit. They typically require a clean credit history for the last 6 years.' },
  { lender: 'HSBC', category: 'Self-Employed', text: 'HSBC requires 2 years of accounts. They are very competitive on rates for those with a strong trading history and high income.' },
  { lender: 'HSBC', category: 'Adverse Credit', text: 'HSBC is very strict on credit. Any significant adverse credit in the last 6 years will likely lead to a decline.' }
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
