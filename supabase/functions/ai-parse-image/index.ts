import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileName } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log(`[AI Vision] Processing image: ${fileName || 'unknown'}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI with vision capability
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Vision-capable model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and extract recipe information.

IMPORTANT: If you detect multiple recipes on this card/image, return them in this JSON format:
{
  "multipleRecipes": true,
  "recipes": [
    {"title": "Recipe Name 1", "text": "INGREDIENTS:\\n[ingredients]\\n\\nMETHOD:\\n[steps]"},
    {"title": "Recipe Name 2", "text": "INGREDIENTS:\\n[ingredients]\\n\\nMETHOD:\\n[steps]"}
  ]
}

If there is only ONE recipe, return as structured text:

INGREDIENTS:
[list each ingredient with amount and name]

METHOD:
[list the steps]

Format ingredients as: [amount] [unit] [ingredient name]
Be precise with measurements. If handwriting is unclear, make your best interpretation.
If you see starter, levain, or sourdough culture, note the exact amount.
Pay special attention to flour types, liquids, salt, and leavening agents.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Vision] Error response:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add credits to continue.');
      }
      
      throw new Error(`AI Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No text extracted from image by AI');
    }

    console.log('[AI Vision] Successfully extracted text');

    // Check if AI returned multiple recipes in JSON format
    let parsedResponse;
    try {
      // Try to parse as JSON first (for multi-recipe case)
      parsedResponse = JSON.parse(extractedText);
      
      if (parsedResponse.multipleRecipes && parsedResponse.recipes) {
        console.log(`[AI Vision] Detected ${parsedResponse.recipes.length} recipes`);
        return new Response(
          JSON.stringify({
            success: true,
            multipleRecipes: parsedResponse.recipes,
            method: 'ai-vision'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (e) {
      // Not JSON, treat as single recipe text
    }

    // Single recipe case
    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        method: 'ai-vision'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[AI Vision] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
