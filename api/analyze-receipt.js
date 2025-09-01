const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image, payerName, notes } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Base64 image is required' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = `You are an assistant that extracts structured receipt data for two roommates, Yuen Ler and Haoming.
Return ONLY valid minified JSON matching this schema:
{
  "items": [{"rawName": string, "displayName": string, "price": number, "suggestedAssignee": "Yuen Ler" | "Haoming" | "Split"}],
  "total": number,
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "store": string | null
}
Rules:
- Prices are numbers in dollars
- Include every line item you can read
- If a field is missing on the receipt, use null
- Derive a human friendly displayName (e.g., AVCDO 5 CT -> 5 Avocados) while preserving rawName
- Use payerName: items default to "Split" meaning the other person owes half to the payer; if the notes indicate an item was only for the payer, set suggestedAssignee to the payer; if only for the roommate, set suggestedAssignee to the other person. The notes are written by the payer.
- Detect the store name from the receipt (e.g., Costco, Trader Joe's)`;

    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: systemPrompt },
            { type: 'input_text', text: `payerName: ${payerName}` },
            { type: 'input_text', text: `notes: ${notes || ''}` },
            { type: 'input_text', text: 'Analyze this receipt image and extract items, totals, store, and suggestedAssignee.' },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${base64Image}` }
          ]
        }
      ]
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('No text output received from OpenAI');
    }

    const receiptData = JSON.parse(outputText);

    res.status(200).json(receiptData);
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    res.status(500).json({ 
      error: 'Failed to analyze receipt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
