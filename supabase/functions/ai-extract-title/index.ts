import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeText } = await req.json();
    console.log('AI extracting title from recipe text');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a recipe title extractor for bread recipes. Extract ONLY the recipe title and optional description.

CRITICAL RULES FOR TITLE:
1. Extract ONLY the actual recipe name (2-8 words, max 60 characters)
2. SKIP all metadata: URLs, dates, author names, "6 min read", blog names, timestamps
3. SKIP ingredient lists: no asterisks, no measurements (cups, grams, ml, tbsp, tsp)
4. If title contains measurements or asterisks → return "Converted Bread Recipe"
5. Examples of GOOD titles:
   - "Challah Bread Recipe"
   - "Ultimate Dinner Rolls with Rosemary"
   - "Overnight Sourdough Boule"
6. Examples of BAD titles (use fallback):
   - "honey * 4 tablespoons or 60mL vegetable oil..."
   - "Ultimate Dinner Rolls with Rosemary and Sea Salt Henry Hunter • 6 min read..."
   - URLs, dates, navigation text

RULES FOR DESCRIPTION (OPTIONAL):
1. Extract 1-2 sentences describing the bread (max 150 characters)
2. Should describe texture, flavor, or use case
3. Examples:
   - "Traditional Jewish braided bread, enriched with eggs and honey."
   - "Soft, buttery dinner rolls with aromatic rosemary and flaky sea salt."
4. If no description found, return empty string

Return a JSON object:
{
  "title": "Recipe Name Here",
  "description": "Optional description here or empty string"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Extract the title and description from this recipe text. Return ONLY valid JSON (no markdown):\n\n${recipeText.substring(0, 1000)}` // Only send first 1000 chars for title extraction
          }
        ],
        temperature: 0.2, // Very low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please check your workspace credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI title extraction response:', aiResponse);

    // Clean up the response
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const extracted = JSON.parse(cleanedResponse);
    
    // Validate title
    let title = extracted.title || 'Converted Bread Recipe';
    let description = extracted.description || '';
    
    // Validation: if title is too long or contains bad patterns, use fallback
    const badPatterns = [
      /\*/,  // asterisks
      /\d+\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)/i, // measurements
      /https?:\/\//i, // URLs
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // dates
      /\d+\s*min\s*read/i, // "6 min read"
    ];
    
    if (title.length > 60 || badPatterns.some(pattern => pattern.test(title))) {
      console.log('Title validation failed, using fallback');
      title = 'Converted Bread Recipe';
    }
    
    // Truncate description if too long
    if (description.length > 150) {
      description = description.substring(0, 147) + '...';
    }

    console.log('Extracted title:', title);
    console.log('Extracted description:', description);

    return new Response(
      JSON.stringify({ 
        success: true, 
        title,
        description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-extract-title function:', error);
    
    // Return fallback values on error instead of failing
    return new Response(
      JSON.stringify({ 
        success: true,
        title: 'Converted Bread Recipe',
        description: '',
        error: 'Title extraction failed, using fallback'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
