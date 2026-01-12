import { ai } from './genkit';
import { z } from 'zod';

export const BillDataSchema = z.object({
    amount: z.number().nullable(),
    date: z.string().nullable().describe('ISO date string or YYYY-MM-DD'),
    description: z.string().nullable(),
    category: z.string().nullable().describe('Suggested ledger or category'),
    vendor: z.string().nullable(),
});

export type BillData = z.infer<typeof BillDataSchema>;

export const processBillFlow = ai.defineFlow(
    {
        name: 'processBill',
        inputSchema: z.object({ imageUrl: z.string() }) as any,
        outputSchema: BillDataSchema as any,
    },
    async (input) => {
        const { imageUrl } = input;

        // Determine content type if it's a data URL
        const isDataUrl = imageUrl.startsWith('data:');
        const contentType = isDataUrl ? imageUrl.split(';')[0].split(':')[1] : 'image/jpeg';

        const response = await ai.generate({
            prompt: `Analyze this construction-related bill or receipt image. 
      Extract the following information:
      - amount: Total Amount (number only, use null if not clear)
      - date: Date of transaction (standardize to ISO YYYY-MM-DD, use null if missing)
      - description: A brief description of what was purchased (e.g., "Rebar 12mm", "Cement 50 bags")
      - category: A suggested ledger category (e.g., "Materials", "Labor", "Transport", "Equipment")
      - vendor: Vendor or supplier name
      
      Respond only in JSON format matching the schema:
      {
        "amount": number,
        "date": "YYYY-MM-DD",
        "description": "text",
        "category": "text",
        "vendor": "text"
      }`,
            messages: [
                {
                    role: 'user',
                    content: [
                        { text: 'Extract data from this bill:' },
                        { media: { url: imageUrl, contentType } },
                    ],
                },
            ],
        });

        try {
            const data = response.output;
            if (!data) {
                throw new Error("Empty AI response");
            }
            return data as BillData;
        } catch (e) {
            console.error("AI Parsing Error:", e);
            return { amount: null, date: null, description: 'Error parsing bill', category: null, vendor: null };
        }
    }
);

