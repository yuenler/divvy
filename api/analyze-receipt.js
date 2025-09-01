const OpenAI = require('openai');

module.exports = async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Base64 image is required' });
    }

    // TODO: Replace with your OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this receipt image and extract all items with their prices. Return the data in the following JSON format:
              {
                "items": [
                  {
                    "name": "item name",
                    "price": 0.00
                  }
                ],
                "total": 0.00,
                "subtotal": 0.00,
                "tax": 0.00,
                "tip": 0.00
              }
              
              Make sure to:
              1. Extract ALL items from the receipt
              2. Include the exact price for each item
              3. Calculate the total amount
              4. If visible, include subtotal, tax, and tip separately
              5. Return ONLY valid JSON, no other text`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse the JSON response
    const receiptData = JSON.parse(content);

    res.status(200).json(receiptData);
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    res.status(500).json({ 
      error: 'Failed to analyze receipt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
