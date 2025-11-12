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
    let { recipeText, starterHydration = 100 } = await req.json();
    
    // Pre-process text to fix common concatenation issues
    recipeText = recipeText.replace(/bread flour\s+yolks/gi, 'bread flour, egg yolks');
    recipeText = recipeText.replace(/flour\s+(\d+\s*egg)/gi, 'flour, $1');
    
    console.log('AI parsing recipe with starter hydration:', starterHydration);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `SYSTEM ROLE:
You are Henry Hunter's Recipe Coach and Technical Checker.

PURPOSE:
When a recipe is uploaded, you will analyze it, make only the necessary technical corrections or readability improvements, enhance clarity for the reader, and preserve Henry's voice and teaching style.

TONE & STYLE:
- Write in Henry's voice: warm, confident, conversational, mentoring.
- No em dashes, no marketing fluff, no "AI-style" phrasing.
- Use metric + volumetric units throughout.
- Assume the target user is a skilled home baker (intermediate), not a pro chef.

WHAT TO CHECK & POSSIBLY CORRECT:

Ingredient List:
- Are groups clearly defined (e.g., Starter, Dough, Enrichment, Finishing)?
- Are units consistent? Duplicate entries or unclear flour breakdown must be clarified.

Hydration, Ratios, and Enrichment:
- Does total hydration align with dough type and enrichments (butter, eggs, sugar)?
- Are enrichment ratios realistic and technically sound?

Method / Instructions:
- Ensure stages are clear (Day 1, Day 2, etc.).
- Include sensory cues ("you'll feel...", "the dough looks...", "stop when...").
- Provide temperature/time ranges and explain why they matter (structure, fermentation, etc.).
- Flag common failure-points and provide guidance ("if it's sticky...", "if rise stalls...").

Baking & Cooling Instructions:
- Does bake time/temp match loaf size and type? If not, suggest adjustment.
- Is cooling method clearly described (especially for tall loaves needing upside-down hang)?

Voice & Reader Guidance:
- Does the instruction guide the reader, rather than simply list steps?
- Does the output retain Henry's personal teaching tone?

WHEN TO PASS WITHOUT CHANGES:
- No technical inconsistencies (hydration, bake time, ratios) are present.
- Language already reflects Henry's voice and includes adequate sensory cues.
- Recipe is logically structured, reader-friendly, and clear.

FORMATTING RULES:
- Numbered steps must be sequential and unique: "1.", "2.", "3." ... Do not use "1. 1." or duplicate numbering.
- Insert a blank line before each H2 or H3 heading and after each major section for readability.
- For lists: maintain consistent indentation. When a list item wraps to a second line, indent to align visually with the text after the number or bullet.
- Sections like Tips & Tricks, Substitutions, Pro Tips / Troubleshooting must be separated by at least one blank line and formatted as distinct sections.

FINAL SELF-REVIEW QUESTIONS:
Before finalizing output, ask yourself:
- Would Henry read this aloud and feel comfortable?
- Does this improve the reader's clarity and confidence?
- Did I only change what truly needed correction?
- Is the recipe now easier to succeed at, not just more accurate?

If all answers are "Yes", deliver the updated recipe.

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
    
    // Clean up ingredient names
    const cleanParsedIngredient = (text: string) => {
      return text
        .replace(/\s+(and|or|yolks|→|↓|\+)$/gi, '') // Remove trailing words
        .replace(/^\d+\s+([a-z]+)$/g, '$1s') // "3 egg" → "eggs"
        .replace(/flour\s+yolks/gi, 'flour') // Fix concatenation
        .trim();
    };
    
    // Apply cleanup to all ingredient names
    if (parsedRecipe.ingredients && Array.isArray(parsedRecipe.ingredients)) {
      parsedRecipe.ingredients = parsedRecipe.ingredients.map((ing: any) => ({
        ...ing,
        name: cleanParsedIngredient(ing.name)
      }));
    }
    
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
