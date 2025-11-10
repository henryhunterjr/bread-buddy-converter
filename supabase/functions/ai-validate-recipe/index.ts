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
    const { regexParsed, aiParsed, recipeText, starterHydration = 100 } = await req.json();
    
    console.log('=== AI VALIDATION REQUEST ===');
    console.log('Regex parsed ingredients:', regexParsed?.ingredients?.length);
    console.log('AI parsed ingredients:', aiParsed?.ingredients?.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build validation prompt comparing both results
    const systemPrompt = `You are a precise recipe validation expert. Compare two parsing attempts (regex and AI) and determine the best result.

VALIDATION RULES:
1. If both parsers agree on flour amount within 5% → HIGH confidence
2. If parsers disagree on ingredients → Analyze which is more accurate
3. Check for common regex errors:
   - Misclassified ingredients (e.g., milk powder as liquid vs enrichment)
   - Missing ingredients (e.g., didn't detect flour in "4 cups all-purpose")
   - Wrong unit conversions
4. Flag ingredients that need user verification
5. Calculate confidence score (0-100) for final result

CONFIDENCE SCORING:
- 90-100: Both parsers agree, all ingredients found
- 70-89: Minor discrepancies, mostly correct
- 50-69: Significant differences, needs review
- Below 50: Major parsing issues, user must verify

Return JSON with this structure:
{
  "validatedRecipe": {
    "ingredients": [
      {
        "name": "bread flour",
        "amount": 500,
        "unit": "g",
        "type": "flour",
        "confidence": "high",
        "source": "regex",
        "aiSuggestion": null
      }
    ],
    "totalFlour": 500,
    "totalLiquid": 350,
    "starterAmount": 0,
    "yeastAmount": 7,
    "saltAmount": 10,
    "hydration": 70,
    "parserUsed": "hybrid",
    "confidence": 95,
    "corrections": []
  },
  "needsReview": false,
  "reviewReasons": [],
  "improvements": ["Fixed milk powder classification from liquid to enrichment"]
}`;

    const userPrompt = `Original recipe text:
${recipeText}

Regex parser result:
${JSON.stringify(regexParsed, null, 2)}

AI parser result:
${JSON.stringify(aiParsed, null, 2)}

Starter hydration: ${starterHydration}%

Validate and return the best combined result. Flag any ingredients that need user verification.`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2, // Low for consistency
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
    
    console.log('AI validation response:', aiResponse);

    // Clean up response
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const validationResult = JSON.parse(cleanedResponse);
    
    console.log('Validation complete:', {
      confidence: validationResult.validatedRecipe.confidence,
      parserUsed: validationResult.validatedRecipe.parserUsed,
      needsReview: validationResult.needsReview,
      improvements: validationResult.improvements?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...validationResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-validate-recipe function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
