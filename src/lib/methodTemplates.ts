import { MethodChange } from '@/types/recipe';

export interface DoughClassification {
  type: 'lean' | 'enriched' | 'sweet';
  sugarPercent: number;
  fatPercent: number;
  milkPercent: number;
  hasEggs?: boolean; // FIX #5: Track if dough has eggs
}

export function classifyDough(
  sugarAmount: number,
  fatAmount: number,
  milkAmount: number,
  totalFlour: number,
  hasEggs: boolean = false // FIX #5: Add egg parameter
): DoughClassification {
  const sugarPercent = (sugarAmount / totalFlour) * 100;
  const fatPercent = (fatAmount / totalFlour) * 100;
  const milkPercent = (milkAmount / totalFlour) * 100;

  let type: 'lean' | 'enriched' | 'sweet';

  // FIX #5: Consider eggs in classification
  if (sugarPercent > 15 || fatPercent > 15) {
    type = 'sweet';
  } else if (sugarPercent > 5 || fatPercent > 5 || milkPercent > 20 || hasEggs) {
    type = 'enriched';
  } else {
    type = 'lean';
  }

  return { type, sugarPercent, fatPercent, milkPercent, hasEggs };
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

/**
 * FIX #5: Yeast method templates based on dough type
 * Returns appropriate method steps for yeast-based bread
 */
export function getYeastMethodTemplate(
  classification: DoughClassification
): MethodChange[] {
  const { type, hasEggs } = classification;

  if (type === 'enriched' || type === 'sweet') {
    return [
      {
        step: '1. MIX & KNEAD',
        change: hasEggs
          ? 'Combine flour, yeast, salt, sugar, and liquids. Add eggs at room temperature. Knead by hand for 8–10 minutes or with a stand mixer (dough hook) for 5–6 minutes. Add softened butter gradually during the last 2-3 minutes of kneading. Dough should be smooth and pass the windowpane test.'
          : 'Combine all ingredients in a bowl. Knead by hand for 8–10 minutes or with a stand mixer (dough hook) for 5–6 minutes until smooth and elastic. Dough should pass the windowpane test.',
        timing: '8-10 min by hand, 5-6 min mixer'
      },
      {
        step: '2. FIRST RISE',
        change: 'Place in a lightly oiled bowl, cover, and let rise 1.5–2 hours at 75–78°F until doubled in size. Enriched doughs rise more slowly than lean doughs.',
        timing: '1.5-2 hours'
      },
      {
        step: '3. SHAPE',
        change: 'Punch down gently, shape as desired (loaf, rolls, braid, or boule), and place on a greased pan or parchment.',
        timing: '5-10 min'
      },
      {
        step: '4. FINAL PROOF',
        change: 'Cover and let rise 60–90 minutes, or until dough springs back slowly when gently pressed.',
        timing: '60-90 min'
      },
      {
        step: '5. BAKE',
        change: hasEggs
          ? 'Preheat oven to 350°F (175°C) for enriched doughs with eggs. Optionally brush with egg wash for a golden crust. Bake 30–35 minutes until deep golden and internal temperature is 190–195°F.'
          : 'Preheat oven to 375°F (190°C). Optionally brush with egg wash or butter for a golden crust. Bake 35–40 minutes until deep golden and internal temperature is 190–195°F.',
        timing: hasEggs ? '30-35 min at 350°F (175°C)' : '35-40 min at 375°F (190°C)'
      },
      {
        step: '6. COOL',
        change: 'Remove from pan and cool on wire rack at least 1 hour before slicing.',
        timing: '1 hour minimum'
      }
    ];
  }

  // LEAN DOUGH TEMPLATE
  return [
    {
      step: '1. MIX & KNEAD',
      change: 'Combine all ingredients in a bowl. Knead by hand for 10–12 minutes or with a stand mixer (dough hook) for 6–8 minutes until smooth and elastic. Dough should pass the windowpane test.',
      timing: '10-12 min by hand, 6-8 min mixer'
    },
    {
      step: '2. FIRST RISE',
      change: 'Place in a lightly oiled bowl, cover, and let rise 1–1.5 hours at 75–78°F until doubled in size.',
      timing: '1-1.5 hours'
    },
    {
      step: '3. SHAPE',
      change: 'Punch down gently, shape into a tight boule or batard, and place on parchment or in a banneton.',
      timing: '5-10 min'
    },
    {
      step: '4. FINAL PROOF',
      change: 'Cover and let rise 45–60 minutes, or until dough springs back slowly when gently pressed.',
      timing: '45-60 min'
    },
    {
      step: '5. BAKE',
      change: 'Preheat oven to 425°F (220°C). Score the top. Bake in a preheated Dutch oven (covered 20 minutes, uncovered 20-25 minutes) OR bake with steam for 40-45 minutes until deep golden and internal temperature is 200–205°F.',
      timing: '40-45 min at 425°F (220°C)'
    },
    {
      step: '6. COOL',
      change: 'Cool on wire rack minimum 1 hour before slicing.',
      timing: '1 hour minimum'
    }
  ];
}
