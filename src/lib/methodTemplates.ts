import { MethodChange } from '@/types/recipe';

export interface DoughClassification {
  type: 'lean' | 'enriched' | 'sweet';
  sugarPercent: number;
  fatPercent: number;
  milkPercent: number;
}

export function classifyDough(
  sugarAmount: number,
  fatAmount: number,
  milkAmount: number,
  totalFlour: number
): DoughClassification {
  const sugarPercent = (sugarAmount / totalFlour) * 100;
  const fatPercent = (fatAmount / totalFlour) * 100;
  const milkPercent = (milkAmount / totalFlour) * 100;

  let type: 'lean' | 'enriched' | 'sweet';
  
  if (sugarPercent > 15 || fatPercent > 15) {
    type = 'sweet';
  } else if (sugarPercent > 5 || fatPercent > 5 || milkPercent > 20) {
    type = 'enriched';
  } else {
    type = 'lean';
  }

  return { type, sugarPercent, fatPercent, milkPercent };
}

export function getMethodTemplate(
  classification: DoughClassification,
  levainDetails: { starter: number; water: number; flour: number; total: number },
  doughDetails: { flour: number; water: number; salt: number }
): MethodChange[] {
  const { type } = classification;
  const { starter, water, flour, total } = levainDetails;
  const { flour: doughFlour, water: doughWater, salt } = doughDetails;

  if (type === 'enriched' || type === 'sweet') {
    return [
      {
        step: '1. BUILD LEVAIN (Night Before)',
        change: `Mix ${starter}g active starter, ${water}g water (80–85°F), and ${flour}g flour. Cover loosely and rest overnight (8-12 hours) until doubled and bubbly. This provides 20% inoculation for this enriched dough.`,
        timing: '8-12 hours overnight'
      },
      {
        step: '2. MIX DOUGH (Morning)',
        change: `In a large bowl, dissolve levain into liquids (water + milk). Add ${doughFlour}g flour and mix until shaggy. Rest 30-45 minutes (autolyse). Add softened butter gradually during first fold, not in initial mix. Add eggs at room temperature after autolyse.`,
        timing: '30-45 min autolyse'
      },
      {
        step: '3. ADD SALT & DEVELOP STRENGTH',
        change: `Sprinkle in ${salt}g salt, mix or pinch to incorporate throughout the dough. Rest 20–30 minutes to allow salt to dissolve and gluten to relax.`,
        timing: '20-30 min rest'
      },
      {
        step: '4. BULK FERMENTATION',
        change: 'Perform 3-4 sets of stretch and folds every 30-45 minutes during the first 2-3 hours. Enriched doughs ferment more slowly due to sugar and fat. Bulk fermentation may take 5-7 hours at 75-78°F. Stop when dough has risen 50-75% and looks airy.',
        timing: '5-7 hours at 75-78°F'
      },
      {
        step: '5. SHAPE',
        change: 'Turn dough onto lightly floured surface. Shape into desired form (rolls, loaf, etc.). Enriched doughs are softer and more forgiving to shape.',
        timing: '10-15 min'
      },
      {
        step: '6. FINAL PROOF',
        change: 'Place shaped dough in greased pan or banneton. Proof 2-3 hours at room temperature until puffy and nearly doubled. When pressed, dough should spring back slowly.',
        timing: '2-3 hours room temp'
      },
      {
        step: '7. BAKE',
        change: 'Preheat oven to 375°F (190°C). Brush with egg wash if desired. Bake 25-35 minutes until deep golden and internal temperature reaches 190-195°F.',
        timing: '25-35 min at 375°F'
      },
      {
        step: '8. COOL',
        change: 'Cool on wire rack for at least 1 hour before slicing.',
        timing: '1 hour minimum'
      }
    ];
  }

  // LEAN DOUGH TEMPLATE
  return [
    {
      step: '1. BUILD LEVAIN (Night Before)',
      change: `Mix ${starter}g active starter, ${water}g water (80–85°F), and ${flour}g flour. Cover loosely and rest overnight (8-12 hours) until doubled and bubbly.`,
      timing: '8-12 hours overnight'
    },
    {
      step: '2. MIX DOUGH (Morning)',
      change: `In a large bowl, dissolve levain into ${doughWater}g warm water. Add ${doughFlour}g flour and mix until shaggy. Rest 45–60 minutes (autolyse) to allow flour to fully hydrate.`,
      timing: '45-60 min autolyse'
    },
    {
      step: '3. ADD SALT & DEVELOP STRENGTH',
      change: `Sprinkle in ${salt}g salt, mix or pinch to incorporate throughout the dough. Rest 20–30 minutes.`,
      timing: '20-30 min rest'
    },
    {
      step: '4. BULK FERMENTATION',
      change: 'Perform 3–4 sets of stretch and folds every 30–45 minutes during the first 2–3 hours. Then let rest undisturbed for 4–6 hours total at 75–78°F. Stop when dough has risen ~50%, looks airy, and holds its shape.',
      timing: '4-6 hours at 75-78°F'
    },
    {
      step: '5. SHAPE',
      change: 'Turn dough onto lightly floured surface. Pre-shape into a round, rest 20 minutes, then perform final shape (boule or batard).',
      timing: '20 min bench rest + shaping'
    },
    {
      step: '6. FINAL PROOF',
      change: 'Place shaped dough seam-side up in a floured banneton. Proof 2–4 hours at room temperature OR refrigerate overnight (8–12 hours).',
      timing: '2-4 hours room temp or 8-12 hours cold'
    },
    {
      step: '7. BAKE',
      change: 'Preheat Dutch oven to 450°F (232°C). Score the top. Bake covered 20 minutes, then uncovered 25–30 minutes until internal temp 205–210°F.',
      timing: '45-50 min at 450°F'
    },
    {
      step: '8. COOL',
      change: 'Cool on wire rack minimum 2 hours before slicing.',
      timing: '2 hours minimum'
    }
  ];
}
