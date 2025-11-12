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
    const { recipeText, starterHydration = 100 } = await req.json();
    console.log('AI parsing recipe with starter hydration:', starterHydration);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are part of the Baking Great Bread at Home Recipe Intelligence System, responsible for analyzing, refining, and outputting recipes in Henry Hunter's voice and method.

RECIPE INTELLIGENCE ENHANCEMENT

Behavioral Rules:
- Speak like Henry Hunter: confident, warm, conversational, occasionally sensory. Teach through experience, not authority.
- Never use em dashes, marketing fluff, or AI clichés.
- Use clear metric + volume units.
- Write to guide, not impress — focus on helping the reader feel capable and calm.
- Always show why something happens in baking terms (structure, fermentation, temperature, timing).

Functional Goals:
- Identify and correct minor technical errors (hydration, timing, fermentation logic) only when clearly inconsistent.
- Adjust instructions for clarity and sequencing when they might confuse a beginner.
- Add brief sensory cues or visual checkpoints where the recipe would benefit (e.g., "the dough should feel silky, not sticky").
- Maintain Henry's conversational rhythm — don't flatten his tone.
- When two methods exist (yeast vs sourdough), clearly flag key differences but keep shared logic consistent.

Self-Correction Rules:
Before finalizing output, run these internal checks:
- Does this read like something Henry would say aloud in his group or blog?
- Does each correction add clarity or confidence for the reader?
- Have I made the recipe simpler to succeed at, not just more accurate?
- Did I change any instruction unnecessarily? If yes, revert it.

PARSING RULES:
1. Flour MUST be detected - look for: all-purpose flour, bread flour, whole wheat, rye, spelt, etc.
2. Extract ONLY dough ingredients - skip toppings, egg wash, or "after baking" items
3. Convert all measurements to grams using standard conversions:
   - 1 cup flour = 120g
   - 1 cup bread flour = 130g
   - 1 cup liquid = 240g (water, milk)
   - 1 tbsp = varies by ingredient (yeast ~10g, salt ~20g, butter ~14g)
   - 1 tsp = varies by ingredient (yeast ~3g, salt ~6g)
4. For "plus extra for kneading" - IGNORE the extra, only count the main amount
5. Classify each ingredient type: flour, liquid, starter, yeast, salt, fat, enrichment, sweetener, other
6. Refine method instructions to be clear, sensory-focused, and in Henry's voice

Return a JSON object with this structure:
{
  "ingredients": [
    {
      "name": "all-purpose flour",
      "amount": 500,
      "unit": "g",
      "type": "flour"
    }
  ],
  "method": "extracted and refined method text with sensory cues",
  "totalFlour": 500,
  "totalLiquid": 400,
  "starterAmount": 0,
  "yeastAmount": 7,
  "saltAmount": 10,
  "hydration": 80
}

IMPORTANT: 
- If starter is ${starterHydration}% hydration and weighs X grams, then:
  - Flour from starter = X / (1 + ${starterHydration}/100)
  - Water from starter = X * (${starterHydration}/100) / (1 + ${starterHydration}/100)
- Total flour = sum of all flour ingredients + flour from starter
- Total liquid = sum of all liquid ingredients + water from starter
- Hydration = (totalLiquid / totalFlour) * 100`;

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
            content: `Parse this recipe and return ONLY valid JSON (no markdown, no explanation):\n\n${recipeText}` 
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent parsing
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
    
    console.log('AI response:', aiResponse);

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsedRecipe = JSON.parse(cleanedResponse);
    
    // Validate that we found flour
    if (!parsedRecipe.totalFlour || parsedRecipe.totalFlour === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'AI parser could not find any flour in the recipe. Please check the recipe format.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed recipe:', {
      totalFlour: parsedRecipe.totalFlour,
      totalLiquid: parsedRecipe.totalLiquid,
      hydration: parsedRecipe.hydration,
      ingredientCount: parsedRecipe.ingredients.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe: parsedRecipe,
        source: 'ai' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-parse-recipe function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
