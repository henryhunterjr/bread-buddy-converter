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

    if (typeof recipeText !== 'string' || recipeText.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No recipe text provided.',
          errorType: 'empty_input',
          errorCode: 'PARSE_002',
          errorSeverity: 'medium',
          errorDetails: 'recipeText was empty or missing',
          partialResults: null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Long blog-style recipes (title, byline, prep times, story copy) are the
    // norm for pasted/PDF input. Cap the input defensively — 24k chars is far
    // beyond any real recipe — and truncate rather than fail.
    const MAX_INPUT_CHARS = 24000;
    if (recipeText.length > MAX_INPUT_CHARS) {
      console.warn(`Input truncated from ${recipeText.length} to ${MAX_INPUT_CHARS} chars`);
      recipeText = recipeText.slice(0, MAX_INPUT_CHARS);
    }

    // Pre-process text to fix common concatenation issues
    recipeText = recipeText.replace(/(\d+g?\s+)?(bread\s+)?flour\s+yolks/gi, '$1$2flour\n3 egg yolks');
    recipeText = recipeText.replace(/flour\s+and\b/gi, 'flour\n');
    recipeText = recipeText.replace(/sugar\s+and\b/gi, 'sugar\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // PARSE-ONLY prompt. This function's one job is extraction — it must never
    // rewrite the method or generate long text. (The previous prompt asked the
    // model to rewrite the entire recipe "in Henry's voice", which on long
    // blog-style input produced huge, slow, often-truncated responses that
    // failed JSON.parse and crashed this function.)
    const systemPrompt = `You are a precise recipe-parsing engine. You receive raw recipe text — often a full blog post with a title, byline, prep/rise/bake times, yield, story copy, and instructions mixed in. Your ONLY job is to extract the DOUGH ingredients and the method text. You never rewrite, embellish, or comment.

PARSING RULES:
1. Extract ONLY dough ingredients — skip toppings, egg wash, glazes, dustings, and "after baking" items.
2. Ignore all narrative/story text, bylines, timestamps, serving suggestions, and nutrition info.
3. Convert all measurements to grams:
   - 1 cup all-purpose flour = 120g; 1 cup bread flour = 127g; 1 cup whole wheat = 113g
   - 1 cup water = 237g; 1 cup milk = 245g
   - 1 tbsp: yeast 9g, salt 18g (kosher 14g), butter 14g, sugar 12.5g, honey 21g, oil 14g
   - 1 tsp: yeast 3g, salt 6g (kosher 5g), sugar 4g
   - 1 large egg = 50g; 1 stick butter = 113g
4. "plus extra for kneading/dusting" — count only the main amount.
5. Classify each ingredient type: flour, liquid, starter, yeast, salt, fat, enrichment, sweetener, other.
6. "method" = the recipe's own instruction steps, condensed to their essential actions. Maximum 1500 characters. Do NOT rewrite style or add commentary.

LEVAIN DOUBLE-COUNT PREVENTION:
If the recipe has a levain/starter/preferment BUILD section and the main dough then references it ("151g levain (from above)", "ripe levain", "all of the levain", "levain from step 1"), mark that main-dough entry with "isLevainReference": true.

OUTPUT: Return ONLY a valid JSON object, no markdown fences, no explanation:
{
  "ingredients": [
    {"name": "bread flour", "amount": 500, "unit": "g", "type": "flour"},
    {"name": "levain", "amount": 151, "unit": "g", "type": "starter", "isLevainReference": true}
  ],
  "method": "condensed instruction steps"
}

All amounts in grams. Do NOT calculate totals or hydration.`;

    // Hard timeout so a hung upstream call returns a clean, typed error
    // instead of letting the function run until the platform kills it.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let response: Response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Parse this recipe and return ONLY valid JSON (no markdown, no explanation):\n\n${recipeText}`
            }
          ],
          temperature: 0.1,
          // Extraction output is small by design; the cap prevents runaway
          // generation and mid-JSON truncation on long inputs.
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        }),
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: 'AI parsing timed out. The built-in parser will be used instead.',
            errorType: 'timeout',
            errorCode: '504',
            errorSeverity: 'medium',
            errorDetails: 'Upstream AI gateway did not respond within 40s',
            partialResults: null,
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Return structured error response
      const errorResponse = {
        error: '',
        errorType: '',
        errorCode: response.status.toString(),
        errorSeverity: 'high',
        errorDetails: errorText,
        partialResults: null
      };

      if (response.status === 429) {
        errorResponse.error = 'Rate limit exceeded. Please try again in a moment.';
        errorResponse.errorType = 'rate_limit';
        errorResponse.errorSeverity = 'medium';
      } else if (response.status === 402) {
        errorResponse.error = 'AI usage limit reached. Please check your workspace credits.';
        errorResponse.errorType = 'usage_limit';
        errorResponse.errorSeverity = 'critical';
      } else {
        errorResponse.error = `AI Gateway error: ${response.status}`;
        errorResponse.errorType = 'ai_gateway_error';
        errorResponse.errorSeverity = 'high';
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content;

    if (typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'AI returned an empty response. The built-in parser will be used instead.',
          errorType: 'empty_ai_response',
          errorCode: 'PARSE_003',
          errorSeverity: 'medium',
          errorDetails: `finish_reason: ${data?.choices?.[0]?.finish_reason ?? 'unknown'}`,
          partialResults: null,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = aiResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let parsedRecipe;
    try {
      parsedRecipe = JSON.parse(cleanedResponse);
    } catch {
      // Salvage: model wrapped the JSON in prose, or output was truncated.
      // Grab the outermost {...} span and try again before giving up.
      const start = cleanedResponse.indexOf('{');
      const end = cleanedResponse.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsedRecipe = JSON.parse(cleanedResponse.slice(start, end + 1));
        } catch {
          parsedRecipe = null;
        }
      }
      if (!parsedRecipe) {
        return new Response(
          JSON.stringify({
            error: 'AI response was not valid JSON. The built-in parser will be used instead.',
            errorType: 'json_parse_error',
            errorCode: 'PARSE_004',
            errorSeverity: 'medium',
            errorDetails: `First 300 chars of AI response: ${cleanedResponse.slice(0, 300)}`,
            partialResults: null,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!Array.isArray(parsedRecipe?.ingredients)) {
      return new Response(
        JSON.stringify({
          error: 'AI response was missing the ingredients list. The built-in parser will be used instead.',
          errorType: 'malformed_ai_response',
          errorCode: 'PARSE_005',
          errorSeverity: 'medium',
          errorDetails: 'Parsed JSON had no ingredients array',
          partialResults: null,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    // Calculate totals from parsed ingredients
    let totalFlour = 0;
    let totalLiquid = 0;
    let starterAmount = 0;
    let yeastAmount = 0;
    let saltAmount = 0;
    
    parsedRecipe.ingredients.forEach((ing: any) => {
      const amount = ing.amount || 0;
      
      if (ing.type === 'flour') {
        totalFlour += amount;
      } else if (ing.type === 'liquid') {
        totalLiquid += amount;
      } else if (ing.type === 'starter') {
        starterAmount += amount;
        // Only break down starter into flour/water if it's NOT a reference to a previously built levain
        // (which would already have its flour/water counted in the levain build section)
        if (!ing.isLevainReference) {
          // Calculate flour and water from starter
          const flourFromStarter = amount / (1 + starterHydration / 100);
          const waterFromStarter = (amount * (starterHydration / 100)) / (1 + starterHydration / 100);
          totalFlour += flourFromStarter;
          totalLiquid += waterFromStarter;
        }
        // If isLevainReference is true, the flour/water are already counted in the levain build section
      } else if (ing.type === 'yeast') {
        yeastAmount += amount;
      } else if (ing.type === 'salt') {
        saltAmount += amount;
      }
    });
    
    const hydration = totalFlour > 0 ? (totalLiquid / totalFlour) * 100 : 0;
    
    // Add calculated fields to parsed recipe
    parsedRecipe.totalFlour = Math.round(totalFlour * 10) / 10;
    parsedRecipe.totalLiquid = Math.round(totalLiquid * 10) / 10;
    parsedRecipe.starterAmount = Math.round(starterAmount * 10) / 10;
    parsedRecipe.yeastAmount = Math.round(yeastAmount * 10) / 10;
    parsedRecipe.saltAmount = Math.round(saltAmount * 10) / 10;
    parsedRecipe.hydration = Math.round(hydration * 10) / 10;
    
    // Validate that we found flour
    if (!parsedRecipe.totalFlour || parsedRecipe.totalFlour === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'AI parser could not find any flour in the recipe. Please check the recipe format.',
          errorType: 'missing_flour',
          errorCode: 'PARSE_001',
          errorSeverity: 'high',
          errorDetails: 'No flour ingredients detected in the recipe text. Recipe must contain flour measurements.',
          partialResults: {
            foundIngredients: parsedRecipe.ingredients.map((ing: any) => ing.name),
            ingredientCount: parsedRecipe.ingredients.length
          }
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
    
    // Determine error type and severity
    let errorType = 'unknown_error';
    let errorSeverity = 'high';
    
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorType = 'json_parse_error';
        errorSeverity = 'high';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorType = 'network_error';
        errorSeverity = 'medium';
      } else if (error.message.includes('LOVABLE_API_KEY')) {
        errorType = 'configuration_error';
        errorSeverity = 'critical';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorType,
        errorCode: '500',
        errorSeverity,
        errorDetails: error instanceof Error ? error.stack : undefined,
        partialResults: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
