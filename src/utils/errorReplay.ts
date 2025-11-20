import { supabase } from '@/integrations/supabase/client';

export interface ErrorReplayResult {
  success: boolean;
  originalError: any;
  replayResult?: any;
  replayError?: string;
  logs: string[];
  timestamp: string;
}

/**
 * Replay a failed error with the exact same context
 */
export async function replayError(errorId: string): Promise<ErrorReplayResult> {
  const logs: string[] = [];
  const timestamp = new Date().toISOString();

  try {
    logs.push(`[${timestamp}] Starting error replay for ID: ${errorId}`);

    // Fetch the original error details
    const { data: error, error: fetchError } = await supabase
      .from('analytics_error_details')
      .select('*')
      .eq('id', errorId)
      .single();

    if (fetchError || !error) {
      throw new Error(`Failed to fetch error details: ${fetchError?.message}`);
    }

    logs.push(`[${timestamp}] Found error: ${error.error_type} - ${error.error_message}`);
    logs.push(`[${timestamp}] Original context: ${JSON.stringify(error.context, null, 2)}`);

    // Extract request data
    const requestData = error.request_data;
    if (!requestData) {
      throw new Error('No request data available for replay');
    }

    logs.push(`[${timestamp}] Request data extracted, replaying...`);

    // Determine which function to call based on error type
    let replayResult;
    
    if (error.error_type === 'ai_vision_error') {
      logs.push(`[${timestamp}] Cannot replay AI vision errors (requires original image file)`);
      throw new Error('AI vision errors require the original image file and cannot be replayed from stored data');
    } else {
      // Replay AI parsing
      logs.push(`[${timestamp}] Calling ai-parse-recipe with original request data`);
      
      const { data, error: replayError } = await supabase.functions.invoke('ai-parse-recipe', {
        body: JSON.parse(JSON.stringify(requestData)) // Ensure clean serialization
      });

      if (replayError) {
        logs.push(`[${timestamp}] Replay resulted in error: ${replayError.message}`);
        return {
          success: false,
          originalError: error,
          replayError: replayError.message,
          logs,
          timestamp
        };
      }

      logs.push(`[${timestamp}] Replay successful! Result: ${JSON.stringify(data, null, 2)}`);
      replayResult = data;
    }

    logs.push(`[${timestamp}] Error replay completed successfully`);

    return {
      success: true,
      originalError: error,
      replayResult,
      logs,
      timestamp
    };

  } catch (error) {
    logs.push(`[${timestamp}] Replay failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      success: false,
      originalError: null,
      replayError: error instanceof Error ? error.message : 'Unknown error',
      logs,
      timestamp
    };
  }
}

/**
 * Test a recipe with current parsing logic (for regression testing)
 */
export interface RecipeTestResult {
  testName: string;
  passed: boolean;
  expectedOutput: any;
  actualOutput: any;
  errors: string[];
}

export async function testRecipe(
  recipeName: string,
  recipeText: string,
  expectedOutput: { totalFlour: number; totalLiquid: number; hydration: number },
  starterHydration: number = 100
): Promise<RecipeTestResult> {
  const errors: string[] = [];

  try {
    const { data, error } = await supabase.functions.invoke('ai-parse-recipe', {
      body: { recipeText, starterHydration }
    });

    if (error) {
      errors.push(`Parsing failed: ${error.message}`);
      return {
        testName: recipeName,
        passed: false,
        expectedOutput,
        actualOutput: null,
        errors
      };
    }

    if (!data.success) {
      errors.push(`AI returned error: ${data.error}`);
      return {
        testName: recipeName,
        passed: false,
        expectedOutput,
        actualOutput: null,
        errors
      };
    }

    const recipe = data.recipe;
    
    // Check if output matches expected
    const flourMatch = Math.abs(recipe.totalFlour - expectedOutput.totalFlour) < 5; // 5g tolerance
    const liquidMatch = Math.abs(recipe.totalLiquid - expectedOutput.totalLiquid) < 5;
    const hydrationMatch = Math.abs(recipe.hydration - expectedOutput.hydration) < 2; // 2% tolerance

    if (!flourMatch) errors.push(`Flour mismatch: expected ${expectedOutput.totalFlour}g, got ${recipe.totalFlour}g`);
    if (!liquidMatch) errors.push(`Liquid mismatch: expected ${expectedOutput.totalLiquid}g, got ${recipe.totalLiquid}g`);
    if (!hydrationMatch) errors.push(`Hydration mismatch: expected ${expectedOutput.hydration}%, got ${recipe.hydration}%`);

    return {
      testName: recipeName,
      passed: flourMatch && liquidMatch && hydrationMatch,
      expectedOutput,
      actualOutput: {
        totalFlour: recipe.totalFlour,
        totalLiquid: recipe.totalLiquid,
        hydration: recipe.hydration
      },
      errors
    };

  } catch (error) {
    errors.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      testName: recipeName,
      passed: false,
      expectedOutput,
      actualOutput: null,
      errors
    };
  }
}

/**
 * Run full regression test suite
 */
export async function runRegressionTests(): Promise<RecipeTestResult[]> {
  const tests = [
    {
      name: 'Simple Sourdough',
      text: `
        50g starter
        100g levain water
        100g levain flour
        375g dough water
        500g dough flour
        10g salt
      `,
      expected: { totalFlour: 625, totalLiquid: 500, hydration: 80 },
      starterHydration: 100
    },
    {
      name: 'Basic Yeasted Bread',
      text: `
        625g flour
        500g water
        10g salt
        7g instant yeast
      `,
      expected: { totalFlour: 625, totalLiquid: 500, hydration: 80 },
      starterHydration: 100
    },
    {
      name: 'High Hydration Sourdough',
      text: `
        50g starter
        100g levain water
        100g levain flour
        425g dough water
        450g dough flour
        12g salt
      `,
      expected: { totalFlour: 575, totalLiquid: 550, hydration: 95.7 },
      starterHydration: 100
    }
  ];

  const results: RecipeTestResult[] = [];
  
  for (const test of tests) {
    const result = await testRecipe(test.name, test.text, test.expected, test.starterHydration);
    results.push(result);
    
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}
