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
    const { 
      recipeText, 
      originalParsed, 
      correctedParsed, 
      userCorrections,
      timestamp = new Date().toISOString()
    } = await req.json();

    console.log('=== LOGGING CORRECTION FOR LEARNING ===');
    console.log('Timestamp:', timestamp);
    console.log('Original parser:', originalParsed?.parserUsed);
    console.log('User made corrections:', userCorrections?.length || 0);

    // Log the correction data for future training
    // This could be stored in a database, sent to an analytics service, etc.
    // For now, we'll just log to console and return success
    
    const correctionData = {
      timestamp,
      recipeText: recipeText.substring(0, 200), // First 200 chars for privacy
      originalFlour: originalParsed?.totalFlour,
      correctedFlour: correctedParsed?.totalFlour,
      originalHydration: originalParsed?.hydration,
      correctedHydration: correctedParsed?.hydration,
      parserUsed: originalParsed?.parserUsed,
      userCorrectionCount: userCorrections?.length || 0,
      corrections: userCorrections?.map((c: any) => ({
        ingredient: c.name?.substring(0, 50),
        field: c.field,
        from: c.from,
        to: c.to
      }))
    };

    console.log('Correction logged:', JSON.stringify(correctionData, null, 2));

    // In the future, this could:
    // 1. Store in Supabase table for analysis
    // 2. Send to analytics service
    // 3. Train a custom model
    // 4. Update regex patterns dynamically
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Correction logged successfully',
        correctionId: `correction_${Date.now()}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-correction function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
